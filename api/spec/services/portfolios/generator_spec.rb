# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Portfolios::Generator do
  let(:mock_gemini_client) { instance_double(Gemini::HttpClient) }

  let(:assessment) do
    Assessment.create!(
      tenant_id: 1,
      created_by: 1,
      name: 'Frontend Engineer Assessment',
      time_limit_min: 30,
      language: 'en'
    )
  end

  let(:session) do
    Session.create!(
      tenant_id: 1,
      assessment: assessment,
      candidate_id: 1,
      invite_token: SecureRandom.hex(16),
      status: 'ended'
    )
  end

  subject(:generator) { described_class.new(session: session, gemini_client: mock_gemini_client) }

  describe '#call' do
    context 'when Gemini returns valid skill evaluation JSON' do
      let(:gemini_response) do
        {
          'configured_skills' => [
            {
              'skill_id' => 'sk-react-01',
              'skill_label' => 'React State Management',
              'level' => 3,
              'confidence' => 'high',
              'evidence' => ['Uses useState and useReducer appropriately.'],
              'competency_summary' => 'Solid understanding of state updates and rendering cycles.'
            }
          ],
          'discovered_skills' => [
            {
              'skill_label' => 'TypeScript Generics',
              'level' => 2,
              'confidence' => 'medium',
              'evidence' => ['Demonstrated basic generic usage in utility types.'],
              'competency_summary' => 'Familiar with common generics pattern.'
            }
          ]
        }
      end

      it 'generates a complete portfolio with configured and discovered skills' do
        allow(mock_gemini_client).to receive(:generate_content).and_return(gemini_response)

        portfolio = generator.call

        expect(portfolio).to be_present
        expect(portfolio.generation_status).to eq('complete')
        expect(portfolio.generated_at).to be_present
        expect(portfolio.generation_error).to be_nil

        # Verify configured skills saved
        configured = portfolio.portfolio_skills.find_by(skill_id: 'sk-react-01')
        expect(configured).to be_present
        expect(configured.is_discovered).to be false
        expect(configured.ai_level).to eq(3)
        expect(configured.ai_confidence).to eq('high')

        # Verify discovered skills saved
        discovered = portfolio.portfolio_skills.find_by(skill_label: 'TypeScript Generics')
        expect(discovered).to be_present
        expect(discovered.is_discovered).to be true
        expect(discovered.ai_level).to eq(2)
      end
    end

    context 'when Gemini client raises an API error' do
      it 'marks portfolio generation_status as failed and records the error message' do
        allow(mock_gemini_client).to receive(:generate_content).and_raise(
          Gemini::HttpClient::ApiError.new('API returned 400')
        )

        expect {
          generator.call
        }.to raise_error(Gemini::HttpClient::ApiError, /API returned 400/)

        portfolio = session.reload.portfolio
        expect(portfolio).to be_present
        expect(portfolio.generation_status).to eq('failed')
        expect(portfolio.generation_error).to include('API returned 400')
      end
    end
  end
end

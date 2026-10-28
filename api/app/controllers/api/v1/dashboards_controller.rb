# frozen_string_literal: true

module Api
  module V1
    class DashboardsController < ApiController
      authorize_auth_token! :assessor

      def show
        assessments_scope = Assessment.order(created_at: :desc)
        sessions_scope    = Session.order(created_at: :desc)
        vacancies_scope   = Vacancy.order(created_at: :desc)

        total_assessments = assessments_scope.count
        total_candidates  = sessions_scope.count
        total_vacancies   = vacancies_scope.count

        active_sessions = sessions_scope.where(status: 'active').includes(:assessment)
        completed_count = sessions_scope.where(status: 'ended').where.not(end_reason: 'error').count
        pending_count   = sessions_scope.where(status: 'pending').count

        recent_assessments = assessments_scope.limit(5).map do |a|
          {
            id:                 a.id,
            name:               a.name,
            time_limit_min:     a.time_limit_min,
            language:           a.language,
            created_at:         a.created_at,
            candidate_count:    a.candidate_count,
            overall_status:     a.overall_status,
            candidates_summary: a.candidates_summary
          }
        end

        recent_sessions = sessions_scope.limit(6).includes(:assessment).map do |s|
          {
            id:               s.id,
            assessment_id:    s.assessment_id,
            assessment_name:  s.assessment&.name,
            candidate_name:   s.candidate_name,
            status:           s.status,
            end_reason:       s.end_reason,
            started_at:       s.started_at,
            created_at:       s.created_at,
            duration_seconds: s.duration_seconds
          }
        end

        live_interviews = active_sessions.map do |s|
          {
            id:               s.id,
            assessment_id:    s.assessment_id,
            assessment_name:  s.assessment&.name,
            candidate_name:   s.candidate_name,
            started_at:       s.started_at,
            duration_seconds: s.duration_seconds
          }
        end

        json_response(
          stats: {
            total_assessments: total_assessments,
            total_candidates:  total_candidates,
            total_vacancies:   total_vacancies,
            active_count:      active_sessions.size,
            completed_count:   completed_count,
            pending_count:     pending_count
          },
          live_interviews:    live_interviews,
          recent_assessments: recent_assessments,
          recent_sessions:    recent_sessions
        )
      end
    end
  end
end


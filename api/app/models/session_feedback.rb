# frozen_string_literal: true

class SessionFeedback < ApplicationRecord
  include TenantScoped

  EXPERIENCE_TAGS = %w[smooth technical_issue confusing too_long other].freeze

  belongs_to :session

  validates :rating, presence: true, inclusion: { in: 1..5 }
  validates :experience_tag, inclusion: { in: EXPERIENCE_TAGS }, allow_nil: true
  validates :session_id, uniqueness: true
  validates :complaint_text, presence: true, if: :has_complaint?
end

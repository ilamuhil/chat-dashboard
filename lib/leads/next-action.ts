const labels: Record<string, string> = {
  no_action_closed: 'No active admissions action',
  respect_contact_consent: 'Respect contact preference — do not contact',
  review_closed_lead_request:
    'Review new request and reopen lead if appropriate',
  assign_lead: 'Assign a lead counsellor',
  review_contact_consent: 'Review contact consent',
  collect_contact_details: 'Collect contact details',
  clarify_course_interest: 'Clarify course interest',
  qualify_lead: 'Review and qualify the enquiry',
  review_eligibility: 'Review eligibility',
  review_elligibility: 'Review eligibility',
  application_follow_up: 'Follow up on application',
  send_course_details: 'Send course details',
}
export function nextActionLabel(value: string | null) {
  if (!value) return 'Review the lead'
  return (
    labels[value] ||
    value
      .replace(/^follow_up_/, 'Follow up on ')
      .replace(/_/g, ' ')
      .replace(/^./, (char) => char.toUpperCase())
      .replace('elligibility', 'eligibility')
  )
}

/** Maps a status string to its CSS class and display label */
const STATUS_MAP = {
  pending:     { label: 'Pending',     cls: 'status-pending' },
  in_progress: { label: 'In Progress', cls: 'status-in_progress' },
  completed:   { label: 'Completed',   cls: 'status-completed' },
  overdue:     { label: 'Overdue',     cls: 'status-overdue' },
};

export default function StatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] || { label: status, cls: '' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}
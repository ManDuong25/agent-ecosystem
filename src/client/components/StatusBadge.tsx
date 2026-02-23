interface Props {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, string> = {
  // Spec phases
  specify:        'badge-info',
  requirements:   'badge-info',
  design:         'badge-warning',
  tasks:          'badge-warning',
  implement:      'badge-warning',
  done:           'badge-success',
  // Task statuses
  pending:        'badge-neutral',
  'in-progress':  'badge-warning',
  failed:         'badge-danger',
  // Skill statuses
  cloned:         'badge-info',
  updating:       'badge-warning',
  ready:          'badge-success',
  error:          'badge-danger',
  // Bug statuses
  open:           'badge-danger',
  investigating:  'badge-warning',
  fixing:         'badge-warning',
  resolved:       'badge-success',
  closed:         'badge-neutral',
  // Bug severity
  low:            'badge-neutral',
  medium:         'badge-warning',
  high:           'badge-danger',
  critical:       'badge-danger',
  // File change types
  added:          'badge-success',
  modified:       'badge-warning',
  deleted:        'badge-danger',
  // Chrome
  launching:      'badge-warning',
  busy:           'badge-warning',
  active:         'badge-success',
  inactive:       'badge-neutral',
  // Generic
  success:        'badge-success',
  warning:        'badge-warning',
  connected:      'badge-success',
  disconnected:   'badge-danger',
};

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const style = STATUS_STYLES[status] ?? 'badge-neutral';
  return (
    <span className={`${style} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {status}
    </span>
  );
}

interface BadgeProps {
  label: string
  variant?: 'blue' | 'green' | 'yellow' | 'gray'
}

const variants = {
  blue: 'bg-blue-600/20 text-blue-400',
  green: 'bg-green-600/20 text-green-400',
  yellow: 'bg-yellow-600/20 text-yellow-400',
  gray: 'bg-gray-700 text-gray-300',
}

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ hover = false, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`bg-gray-900 border border-gray-800 rounded-2xl ${hover ? 'hover:border-gray-600 hover:bg-gray-800/50 transition-all' : ''} ${className}`}
    />
  )
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`p-5 ${className}`} />
}
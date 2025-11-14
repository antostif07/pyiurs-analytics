// app/components/ModuleCard.tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleConfig } from '@/config/modules'

interface ModuleCardProps {
  module: ModuleConfig
  index: number
}

export default function ModuleCard({ module, index }: ModuleCardProps) {
  const Icon = module.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link href={module.href}>
        <Card className="group relative p-6 h-44 bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer">
          <div className={`absolute inset-0 bg-gradient-to-r ${module.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-all duration-300`} />
          <CardContent className="flex flex-col justify-center items-center h-full space-y-4">
            <div className={`p-4 rounded-full bg-gradient-to-r ${module.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-center">
              {module.name}
            </h4>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
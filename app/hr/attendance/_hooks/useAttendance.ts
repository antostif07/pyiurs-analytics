// app/hr/attendance/_hooks/useAttendance.ts

import { useEffect, useState } from 'react'
import { getAttendances } from '../_services/attendance.service'
import { Attendance } from '../types'

export function useAttendance(
  employeeId: string,
  start: string,
  end: string
) {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!employeeId) return

    const fetch = async () => {
      setLoading(true)
      try {
        const data = await getAttendances(employeeId, start, end)
        setAttendances(data || [])
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [employeeId, start, end])

  return { attendances, setAttendances, loading }
}
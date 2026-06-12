'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { worksheetsApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  FileType,
  Image,
} from 'lucide-react'

export default function ChildWorksheetsPage() {
  const { data: worksheetsData, isLoading } = useQuery({
    queryKey: ['child-worksheets'],
    queryFn: () => worksheetsApi.list({ assigned_to: 'me' }),
  })

  const assignments = worksheetsData?.data || []

  const handleDownload = (worksheet: any) => {
    if (worksheet.file_path) {
      window.open(worksheet.file_path, '_blank')
    } else {
      toast.info('File not available for download')
    }
  }

  const handlePrint = (worksheet: any) => {
    if (worksheet.file_path) {
      const printWindow = window.open(worksheet.file_path, '_blank')
      printWindow?.print()
    }
  }

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-8 w-8 text-red-500" />
      case 'doc':
      case 'docx': return <FileText className="h-8 w-8 text-blue-500" />
      case 'png':
      case 'jpg':
      case 'jpeg': return <Image className="h-8 w-8 text-green-500" />
      default: return <FileType className="h-8 w-8 text-muted-foreground" />
    }
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Worksheets</h1>
            <p className="text-muted-foreground">Complete worksheets to practice what you&apos;ve learned!</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No worksheets assigned</h3>
                <p className="text-sm text-muted-foreground">No worksheets available yet. Check back later!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment: any) => {
                const ws = assignment.worksheet
                return (
                  <Card key={assignment.id} className="hover:shadow-lg transition-all overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        {getFileIcon(ws?.file_type)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{ws?.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{ws?.description}</p>
                        </div>
                        <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                          {assignment.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {ws?.worksheet_type?.replace('_', ' ')}
                        </Badge>
                        {ws?.file_type && (
                          <Badge variant="outline" className="text-xs uppercase">
                            {ws.file_type}
                          </Badge>
                        )}
                        {ws?.file_size && (
                          <span>{Math.round(ws.file_size / 1024)}KB</span>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        {assignment.status !== 'completed' && (
                          <Button size="sm" className="flex-1 gap-2" onClick={() => {
                            if (ws?.is_interactive) {
                              toast.info('Interactive worksheet - opening editor...')
                            } else {
                              handleDownload(ws)
                            }
                          }}>
                            <CheckCircle2 className="h-3 w-3" />
                            {ws?.is_interactive ? 'Open' : 'Complete'}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleDownload(ws)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handlePrint(ws)}>
                          <Printer className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  )
}

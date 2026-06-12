'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { codingApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Code,
  Play,
  CheckCircle2,
  ArrowLeft,
  FileCode,
  Terminal,
} from 'lucide-react'

const LANG_COLORS: Record<string, string> = {
  html: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  css: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  javascript: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  python: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  scratch: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

export default function ChildCodingPage() {
  const queryClient = useQueryClient()
  const [activeProject, setActiveProject] = useState<any>(null)
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [activeTab, setActiveTab] = useState('projects')

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['child-coding'],
    queryFn: () => codingApi.getChildProjects('me'),
  })

  const submitMutation = useMutation({
    mutationFn: (data: any) => codingApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-coding'] })
      toast.success('Project submitted! XP earned! 🎉')
    },
    onError: () => toast.error('Failed to submit project'),
  })

  const handleStart = (project: any) => {
    setActiveProject(project)
    setCode(project.starter_code || getDefaultCode(project.language))
    setOutput('')
  }

  const getDefaultCode = (language: string) => {
    switch (language) {
      case 'html':
        return '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Project</title>\n  <style>\n    body { font-family: sans-serif; }\n  </style>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>'
      case 'css':
        return '/* Your CSS here */\nbody {\n  margin: 0;\n  padding: 20px;\n  font-family: sans-serif;\n}'
      case 'javascript':
        return '// Your JavaScript here\nconsole.log("Hello World!");\n'
      case 'python':
        return '# Your Python code here\nprint("Hello World!")\n'
      default:
        return '// Start coding here'
    }
  }

  const handleRun = () => {
    if (activeProject.language === 'html') {
      setOutput(`<!-- HTML Preview -->\n${code.slice(0, 500)}...\n\n(Run in browser for full preview)`)
    } else if (activeProject.language === 'javascript') {
      try {
        const logs: string[] = []
        const mockConsole = { log: (...args: any[]) => logs.push(args.join(' ')) }
        new Function('console', code)(mockConsole)
        setOutput(logs.join('\n') || 'Code ran successfully (no output)')
      } catch (e: any) {
        setOutput(`Error: ${e.message}`)
      }
    } else {
      setOutput('Code ready for review. Submit to get feedback!')
    }
  }

  const handleSubmit = () => {
    submitMutation.mutate({
      project_id: activeProject.id,
      code: code,
      language: activeProject.language,
    })
  }

  // Active project view
  if (activeProject) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setActiveProject(null)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Projects
              </Button>
              <div className="flex items-center gap-2">
                <Badge className={LANG_COLORS[activeProject.language]}>
                  <FileCode className="h-3 w-3 mr-1" />
                  {activeProject.language.toUpperCase()}
                </Badge>
                <Badge variant="outline">+{activeProject.xp_reward} XP</Badge>
              </div>
            </div>

            <Card>
              <CardContent className="p-5">
                <h2 className="text-xl font-bold mb-2">{activeProject.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{activeProject.description}</p>
                {activeProject.instructions && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4 text-sm whitespace-pre-wrap">
                    {activeProject.instructions}
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="code">Code Editor</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
              </TabsList>
              <TabsContent value="code">
                <Card>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                      <span className="text-xs font-mono text-muted-foreground">
                        {activeProject.language}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleRun} className="gap-1">
                          <Play className="h-3 w-3" /> Run
                        </Button>
                        <Button size="sm" onClick={handleSubmit} disabled={submitMutation.isPending} className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="min-h-[400px] font-mono text-sm border-0 rounded-none focus-visible:ring-0 resize-y"
                      placeholder="Write your code here..."
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="output">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Output</span>
                    </div>
                    <pre className="bg-black/5 dark:bg-white/5 rounded-lg p-4 min-h-[200px] text-sm font-mono whitespace-pre-wrap">
                      {output || 'Click "Run" to see output here'}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  // Project list view
  const projects = projectsData?.data || []

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Coding Projects</h1>
            <p className="text-muted-foreground">Learn to code with fun projects!</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No coding projects yet</h3>
                <p className="text-sm text-muted-foreground">Your parent hasn&apos;t assigned any coding projects yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project: any) => (
                <Card key={project.id} className="hover:shadow-lg transition-all group overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-purple-500" />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <Badge className={LANG_COLORS[project.language]}>
                        {project.language.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">+{project.xp_reward} XP</Badge>
                    </div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {project.difficulty}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleStart(project)}
                      className="w-full gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      size="sm"
                    >
                      <Code className="h-3 w-3" /> Start Coding
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  )
}

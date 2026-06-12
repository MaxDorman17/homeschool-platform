'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quizzesApi } from '@/services/api'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  FileQuestion,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  ArrowLeft,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export default function ChildQuizzesPage() {
  const queryClient = useQueryClient()
  const [activeQuiz, setActiveQuiz] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [showResults, setShowResults] = useState(false)
  const [resultData, setResultData] = useState<any>(null)

  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ['child-quizzes'],
    queryFn: () => quizzesApi.getChildQuizzes('me'),
  })

  const submitMutation = useMutation({
    mutationFn: (data: any) => quizzesApi.submitAttempt(data),
    onSuccess: (res) => {
      setResultData(res.data)
      setShowResults(true)
      queryClient.invalidateQueries({ queryKey: ['child-quizzes'] })
      toast.success(`Quiz submitted! Score: ${res.data.score}%`)
    },
    onError: () => toast.error('Failed to submit quiz'),
  })

  const handleStartQuiz = (assignment: any) => {
    setActiveQuiz(assignment)
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
    setResultData(null)
  }

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = () => {
    const questions = activeQuiz.quiz?.questions || []
    const formattedAnswers = questions.map((q: any) => ({
      question_id: q.id,
      answer: answers[q.id] || '',
    }))
    submitMutation.mutate({
      quiz_assignment_id: activeQuiz.id,
      answers: formattedAnswers,
    })
  }

  const allAnswered = () => {
    const questions = activeQuiz?.quiz?.questions || []
    return questions.every((q: any) => answers[q.id] !== undefined && answers[q.id] !== '')
  }

  // Quiz taking view
  if (activeQuiz && !showResults) {
    const questions = activeQuiz.quiz?.questions || []
    const question = questions[currentQuestion]
    if (!question) return null

    return (
      <AuthGuard>
        <AppShell>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setActiveQuiz(null)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Quit Quiz
              </Button>
              <div className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </div>
            </div>

            {/* Progress bar */}
            <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />

            <Card className="border-2 border-primary/20">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Badge variant="outline" className="text-primary">
                    {question.question_type.replace('_', ' ')} · {question.points} pts
                  </Badge>
                  <h2 className="text-xl font-semibold">{question.question_text}</h2>
                </div>

                {/* Multiple Choice */}
                {question.question_type === 'multiple_choice' && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(v) => handleAnswer(question.id, v)}
                    className="space-y-3"
                  >
                    {question.options.map((opt: string, i: number) => (
                      <div key={i} className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value={opt} id={`q${question.id}-${i}`} />
                        <Label htmlFor={`q${question.id}-${i}`} className="flex-1 cursor-pointer font-normal">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* True/False */}
                {question.question_type === 'true_false' && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(v) => handleAnswer(question.id, v)}
                    className="space-y-3"
                  >
                    {['True', 'False'].map((opt) => (
                      <div key={opt} className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value={opt} id={`q${question.id}-${opt}`} />
                        <Label htmlFor={`q${question.id}-${opt}`} className="flex-1 cursor-pointer font-normal">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Short Answer */}
                {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
                  <Textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[120px]"
                  />
                )}

                {/* Fill in blank */}
                {question.question_type === 'fill_blank' && (
                  <Textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    placeholder="Fill in the blank..."
                    className="min-h-[80px]"
                  />
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {questions.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestion(i)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      i === currentQuestion
                        ? 'bg-primary text-primary-foreground'
                        : answers[questions[i]?.id]
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              {currentQuestion < questions.length - 1 ? (
                <Button onClick={() => setCurrentQuestion((p) => p + 1)} disabled={!answers[question.id]}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!allAnswered() || submitMutation.isPending} className="gap-2">
                  {submitMutation.isPending ? 'Submitting...' : <><CheckCircle2 className="h-4 w-4" /> Submit Quiz</>}
                </Button>
              )}
            </div>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  // Results view
  if (showResults && resultData) {
    return (
      <AuthGuard>
        <AppShell>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className={`border-2 ${resultData.score >= 70 ? 'border-green-500' : 'border-yellow-500'}`}>
              <CardContent className="py-8 text-center space-y-4">
                <div className="text-6xl">{resultData.score >= 70 ? '🎉' : '💪'}</div>
                <h2 className="text-2xl font-bold">
                  {resultData.score >= 70 ? 'Great Job!' : 'Keep Practicing!'}
                </h2>
                <div className="text-5xl font-bold text-primary">{resultData.score}%</div>
                <p className="text-muted-foreground">
                  {resultData.correct_answers} of {resultData.total_questions} correct
                </p>
                {resultData.score >= activeQuiz.quiz?.passing_score && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-sm px-4 py-1">
                    <Trophy className="h-4 w-4 mr-1" /> Passed!
                  </Badge>
                )}
                <div className="flex gap-3 justify-center pt-4">
                  <Button onClick={() => { setActiveQuiz(null); setShowResults(false) }}>Back to Quizzes</Button>
                  <Button variant="outline" onClick={() => handleStartQuiz(activeQuiz)}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </AppShell>
      </AuthGuard>
    )
  }

  // Quiz list view
  const assignments = quizzesData?.data || []

  return (
    <AuthGuard>
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Quizzes</h1>
            <p className="text-muted-foreground">Test your knowledge and earn XP!</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No quizzes assigned</h3>
                <p className="text-sm text-muted-foreground">Your parent hasn&apos;t assigned any quizzes yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment: any) => {
                const quiz = assignment.quiz
                const questionCount = quiz?.questions?.length || 0
                return (
                  <Card key={assignment.id} className="hover:shadow-lg transition-all">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary">{quiz?.subject?.name || 'General'}</Badge>
                        <Badge className={`text-xs ${assignment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {assignment.status}
                        </Badge>
                      </div>
                      <h3 className="font-semibold">{quiz?.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><FileQuestion className="h-3 w-3" /> {questionCount} questions</span>
                        {quiz?.time_limit_minutes > 0 && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {quiz.time_limit_minutes} min</span>
                        )}
                        <span className="flex items-center gap-1 text-amber-500">
                          <Zap className="h-3 w-3" />
                          30 XP
                        </span>
                        <Badge className={`text-xs ${DIFFICULTY_COLORS[quiz?.difficulty] || DIFFICULTY_COLORS.beginner}`}>
                          {quiz?.difficulty}
                        </Badge>
                      </div>
                      {assignment.status === 'completed' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Score</span>
                            <span className="font-medium">{assignment.score}%</span>
                          </div>
                          <Progress value={assignment.score} className="h-1.5" />
                        </div>
                      )}
                      <Button
                        onClick={() => handleStartQuiz(assignment)}
                        disabled={assignment.status === 'completed'}
                        className="w-full gap-2"
                        variant={assignment.status === 'completed' ? 'outline' : 'default'}
                      >
                        {assignment.status === 'completed' ? 'View Results' : 'Start Quiz'}
                      </Button>
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

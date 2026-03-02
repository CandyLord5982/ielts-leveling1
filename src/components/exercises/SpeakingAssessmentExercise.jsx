import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useProgress } from '../../hooks/useProgress'
import { supabase } from '../../supabase/client'
import { saveRecentExercise } from '../../utils/recentExercise'
import { callMegaLLMScoring } from '../../utils/aiScoringService'
import LoadingSpinner from '../ui/LoadingSpinner'
import RichTextRenderer from '../ui/RichTextRenderer'
import { Mic, Square, ArrowRight, ArrowLeft, Star, RefreshCw, CheckCircle, MessageSquare } from 'lucide-react'
import { assetUrl } from '../../hooks/useBranding'

const themeSideImages = {
  blue: {
    left: assetUrl('/image/theme_question/ice_left.png'),
    right: assetUrl('/image/theme_question/ice_right.png'),
  },
  green: {
    left: assetUrl('/image/theme_question/forest_left.png'),
    right: assetUrl('/image/theme_question/forest_right.png')
  },
  purple: {
    left: assetUrl('/image/theme_question/pirate.png'),
    right: assetUrl('/image/theme_question/pirate.png')
  },
  orange: {
    left: assetUrl('/image/theme_question/ninja_left.png'),
    right: assetUrl('/image/theme_question/ninja_right.png')
  },
  red: {
    left: assetUrl('/image/theme_question/dino_left.png'),
    right: assetUrl('/image/theme_question/dino_right.png')
  },
  yellow: {
    left: assetUrl('/image/theme_question/desert_left.png'),
    right: assetUrl('/image/theme_question/desert_right.png')
  }
}

const getThemeSideImages = (theme) => themeSideImages[theme] || themeSideImages.blue

const SpeakingAssessmentExercise = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { canCreateContent } = usePermissions()
  const { startExercise, completeExerciseWithXP } = useProgress()
  const isTeacherView = canCreateContent()

  const searchParams = new URLSearchParams(location.search)
  const exerciseId = searchParams.get('exerciseId')
  const sessionId = searchParams.get('sessionId')

  const [exercise, setExercise] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null)
  const [colorTheme, setColorTheme] = useState('blue')

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionResults, setQuestionResults] = useState([])
  const [isQuizComplete, setIsQuizComplete] = useState(false)
  const [xpAwarded, setXpAwarded] = useState(0)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [interimTranscription, setInterimTranscription] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [timerActive, setTimerActive] = useState(false)
  const timerIntervalRef = useRef(null)

  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      if (exerciseId && user) {
        await startExercise(exerciseId)
      }
    }
    init()
  }, [exerciseId, user])

  useEffect(() => {
    if (exerciseId) {
      fetchExercise()
    } else {
      setLoading(false)
      setError('Exercise ID not found')
    }
  }, [exerciseId])

  useEffect(() => {
    if (sessionId) fetchSessionInfo()
  }, [sessionId])

  useEffect(() => {
    if (isQuizComplete && questionResults.length > 0) {
      markExerciseCompleted()
    }
  }, [isQuizComplete])

  // Start timer when question changes
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const q = questions[currentQuestionIndex]
      const timeLimit = q?.time_limit || 0
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (timeLimit > 0) {
        setTimeRemaining(timeLimit)
        setTimerActive(true)
      } else {
        setTimeRemaining(null)
        setTimerActive(false)
      }
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) }
  }, [currentQuestionIndex, questions])

  // Countdown
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current)
            setTimerActive(false)
            stopRecording()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current) }
  }, [timerActive, timeRemaining])

  const fetchSessionInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, units:unit_id (id, title, course_id, color_theme)')
        .eq('id', sessionId)
        .single()
      if (error) throw error
      setSession(data)
      const theme = data?.color_theme || data?.units?.color_theme || 'blue'
      setColorTheme(theme)
    } catch (err) {
      console.error('Error fetching session info:', err)
    }
  }

  const fetchExercise = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .eq('exercise_type', 'speaking_assessment')
        .single()
      if (error) throw error
      if (data?.content?.questions) {
        setExercise(data)
        setQuestions(data.content.questions)
        try {
          saveRecentExercise({ ...data, continuePath: `/study/speaking-assessment?exerciseId=${data.id}&sessionId=${sessionId}` })
        } catch { }
      } else {
        setError('No questions found in this exercise')
      }
    } catch (err) {
      console.error('Error fetching exercise:', err)
      setError('Unable to load exercise data')
    } finally {
      setLoading(false)
    }
  }

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    // Clean up previous
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    setTranscription('')
    setInterimTranscription('')
    setAiResult(null)
    setShowResults(false)

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    let finalText = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript + ' '
        } else {
          interim += transcript
        }
      }
      setTranscription(finalText.trim())
      setInterimTranscription(interim)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setInterimTranscription('')
      if (finalText.trim()) {
        analyzeWithAI(finalText.trim())
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const analyzeWithAI = async (spokenText) => {
    const currentQuestion = questions[currentQuestionIndex]
    if (!spokenText || !currentQuestion) return

    setIsAnalyzing(true)

    const keyPoints = currentQuestion.key_points?.join(', ') || ''
    const criteria = currentQuestion.evaluation_criteria || 'content relevance, vocabulary, grammar, fluency'

    const prompt = `You are an IELTS speaking examiner. Evaluate the following spoken response.

Topic/Prompt: "${currentQuestion.prompt}"
${keyPoints ? `Key points to cover: ${keyPoints}` : ''}
Evaluation criteria: ${criteria}

Student's spoken response: "${spokenText}"

Provide a detailed evaluation in JSON format:
{
  "overall_score": number (0-100),
  "content_score": number (0-100),
  "vocabulary_score": number (0-100),
  "grammar_score": number (0-100),
  "fluency_score": number (0-100),
  "strengths": "2-3 sentences about what the student did well",
  "suggestions": "2-3 specific, actionable suggestions for improvement",
  "sample_improvement": "One example sentence showing better phrasing or vocabulary"
}`

    try {
      const result = await callMegaLLMScoring(
        currentQuestion.prompt,
        spokenText,
        currentQuestion.key_points || [],
        'IELTS speaking assessment',
        'en'
      )

      // Try to get richer result via direct API call with our custom prompt
      let finalResult = result
      try {
        const API_KEY = import.meta.env.VITE_MEGALLM_API_KEY || 'sk-mega-90798a7547487b440a37b054ffbb33cbc57d85cf86929b52bb894def833d784e'
        const response = await fetch('https://ai.megallm.io/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai-gpt-oss-20b',
            messages: [
              { role: 'system', content: 'You are an expert IELTS speaking examiner. Provide fair, detailed, and encouraging feedback. Always respond in JSON format.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1200,
            temperature: 0.3
          })
        })
        if (response.ok) {
          const data = await response.json()
          const content = data.choices[0].message.content
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            if (parsed.overall_score !== undefined) {
              finalResult = parsed
            }
          }
        }
      } catch (e) {
        // Use basic result as fallback
        finalResult = {
          overall_score: result.score || 0,
          content_score: result.score || 0,
          vocabulary_score: result.score || 0,
          grammar_score: result.score || 0,
          fluency_score: result.score || 0,
          strengths: 'Your response addressed the topic.',
          suggestions: result.explanation || 'Practice speaking more regularly to improve fluency.',
          sample_improvement: ''
        }
      }

      setAiResult(finalResult)
      setShowResults(true)
    } catch (err) {
      console.error('AI analysis error:', err)
      setAiResult({
        overall_score: 50,
        content_score: 50,
        vocabulary_score: 50,
        grammar_score: 50,
        fluency_score: 50,
        strengths: 'Your response was recorded successfully.',
        suggestions: 'AI analysis is temporarily unavailable. Please try again.',
        sample_improvement: ''
      })
      setShowResults(true)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleNextQuestion = () => {
    const result = {
      questionIndex: currentQuestionIndex,
      transcription,
      overallScore: aiResult?.overall_score || 0,
      aiResult
    }
    setQuestionResults(prev => [...prev, result])

    // Reset for next question
    setTranscription('')
    setInterimTranscription('')
    setAiResult(null)
    setShowResults(false)

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setIsQuizComplete(true)
    }
  }

  const markExerciseCompleted = async () => {
    if (!user || !exerciseId) return
    const allResults = [...questionResults]
    const avgScore = allResults.length > 0
      ? Math.round(allResults.reduce((sum, r) => sum + (r.overallScore || 0), 0) / allResults.length)
      : 0

    try {
      const baseXP = exercise?.xp_reward || 15
      const bonusXP = avgScore >= 90 ? Math.round(baseXP * 0.5) : avgScore >= 80 ? Math.round(baseXP * 0.3) : 0
      const totalXP = baseXP + bonusXP
      const result = await completeExerciseWithXP(exerciseId, totalXP, {
        score: avgScore,
        max_score: 100,
        xp_earned: totalXP
      })
      if (result?.xpAwarded > 0) setXpAwarded(result.xpAwarded)
    } catch (err) {
      console.error('Error marking exercise completed:', err)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={fetchExercise} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Try Again
        </button>
      </div>
    )
  }

  if (!questions.length && !isTeacherView) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 mb-4">No questions available</div>
        <Link to="/study"><button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Study</button></Link>
      </div>
    )
  }

  // Teacher preview
  if (isTeacherView) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{exercise?.title || 'Speaking Assessment'}</h2>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Speaking Prompt</p>
                  <div className="text-lg font-semibold text-gray-900 mb-2">
                    <RichTextRenderer content={q.prompt} allowImages={true} />
                  </div>
                  {q.instructions && (
                    <p className="text-sm text-gray-600 mb-2">{q.instructions}</p>
                  )}
                  {q.key_points?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {q.key_points.map((kp, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{kp}</span>
                      ))}
                    </div>
                  )}
                  {q.time_limit > 0 && (
                    <p className="text-xs text-gray-500 mt-2">Time limit: {q.time_limit}s</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const sideImages = getThemeSideImages(colorTheme)

  return (
    <>
      <div className="hidden md:block fixed left-0 bottom-0 w-48 lg:w-64 xl:w-80 pointer-events-none z-10">
        <img src={sideImages.left} alt="" className="w-full h-auto object-contain" style={{ maxHeight: '80vh' }} />
      </div>
      <div className="hidden md:block fixed right-0 bottom-0 w-48 lg:w-64 xl:w-80 pointer-events-none z-10">
        <img src={sideImages.right} alt="" className="w-full h-auto object-contain" style={{ maxHeight: '80vh' }} />
      </div>

      <div className="relative px-4">
        <div className="max-w-4xl mx-auto space-y-6 relative z-20">

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-5 border border-gray-200">
            <p className="text-xs md:text-sm font-medium text-gray-500 truncate mb-1">{exercise?.title}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">Progress</span>
                <span className="text-xs font-semibold text-purple-600">
                  {currentQuestionIndex + 1} / {totalQuestions}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
            {timeRemaining !== null && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-800">Time Remaining</span>
                  <span className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                    {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
                {timeRemaining <= 10 && <p className="text-xs text-red-600 mt-1">Recording will stop soon!</p>}
              </div>
            )}
          </div>

          {/* Complete screen */}
          {isQuizComplete && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
              <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-purple-800 mb-2">Exercise Complete!</h2>
              {questionResults.length > 0 && (
                <p className="text-gray-600 mb-2">
                  Average Score: {Math.round(questionResults.reduce((s, r) => s + (r.overallScore || 0), 0) / questionResults.length)}%
                </p>
              )}
              {xpAwarded > 0 && (
                <div className="flex items-center justify-center gap-2 text-yellow-600 font-semibold mb-6">
                  <Star className="w-5 h-5" />
                  <span>+{xpAwarded} XP earned!</span>
                </div>
              )}
              <button
                onClick={() => {
                  if (session?.units) {
                    navigate(`/study/course/${session.units.course_id}/unit/${session.unit_id}/session/${sessionId}`)
                  } else {
                    navigate('/study')
                  }
                }}
                className="w-full max-w-sm mx-auto block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                Back to Exercise List
              </button>
            </div>
          )}

          {/* Question card */}
          {!isQuizComplete && currentQuestion && (
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 border border-gray-200 border-l-4 border-l-purple-400 relative">
              <div className="absolute top-4 right-6 flex gap-2 z-20">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>

              <div className="space-y-5 pt-4">
                {/* Topic badge */}
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Speaking Task {currentQuestionIndex + 1}</span>
                </div>

                {/* Prompt */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    <RichTextRenderer content={currentQuestion.prompt} />
                  </div>
                  {currentQuestion.instructions && (
                    <p className="text-sm text-gray-600 mt-2">{currentQuestion.instructions}</p>
                  )}
                </div>

                {/* Key points */}
                {currentQuestion.key_points?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Points to cover:</p>
                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.key_points.map((kp, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">{kp}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recording section */}
                {!showResults && !isAnalyzing && (
                  <div className="flex flex-col items-center space-y-4 py-4">
                    {!speechSupported && (
                      <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center mb-2">
                        Speech recognition is not supported in your browser. Please use Chrome or Edge.
                        <br />
                        <button
                          className="mt-2 underline text-yellow-900"
                          onClick={() => {
                            setShowResults(true)
                            setAiResult({
                              overall_score: 0,
                              content_score: 0,
                              vocabulary_score: 0,
                              grammar_score: 0,
                              fluency_score: 0,
                              strengths: 'Please use a supported browser to enable speech recognition.',
                              suggestions: 'Use Google Chrome or Microsoft Edge for best results.',
                              sample_improvement: ''
                            })
                          }}
                        >
                          Skip this question
                        </button>
                      </div>
                    )}

                    {speechSupported && (
                      <>
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                            isRecording
                              ? 'bg-red-500 animate-pulse shadow-xl shadow-red-200'
                              : 'bg-purple-600 hover:bg-purple-700 shadow-lg'
                          }`}
                        >
                          {isRecording ? (
                            <Square className="w-9 h-9 text-white" />
                          ) : (
                            <Mic className="w-9 h-9 text-white" />
                          )}
                        </button>
                        <p className="text-sm text-gray-500">
                          {isRecording ? 'Recording... tap to stop' : 'Tap to start speaking'}
                        </p>
                      </>
                    )}

                    {/* Live transcription */}
                    {(transcription || interimTranscription) && (
                      <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Your speech:</p>
                        <p className="text-gray-800">
                          {transcription}
                          <span className="text-gray-400 italic">{interimTranscription}</span>
                        </p>
                      </div>
                    )}

                    {/* Manual retry if has transcription but not submitted */}
                    {transcription && !isRecording && (
                      <button
                        onClick={() => analyzeWithAI(transcription)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Analyze My Response
                      </button>
                    )}
                  </div>
                )}

                {/* Analyzing */}
                {isAnalyzing && (
                  <div className="flex flex-col items-center py-8 space-y-3">
                    <RefreshCw className="w-10 h-10 text-purple-600 animate-spin" />
                    <p className="text-gray-600 font-medium">AI is analyzing your response...</p>
                  </div>
                )}

                {/* Results */}
                {showResults && aiResult && (
                  <div className="space-y-4">
                    {/* Transcription recap */}
                    {transcription && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 mb-1">You said:</p>
                        <p className="text-sm text-gray-800 italic">"{transcription}"</p>
                      </div>
                    )}

                    {/* Overall score ring */}
                    <div className="flex flex-col items-center py-4">
                      <div className="relative w-36 h-36">
                        <svg className="w-36 h-36 transform -rotate-90">
                          <circle cx="72" cy="72" r="60" stroke="#e5e7eb" strokeWidth="14" fill="none" />
                          <circle
                            cx="72" cy="72" r="60"
                            stroke={aiResult.overall_score >= 80 ? '#9333ea' : aiResult.overall_score >= 60 ? '#eab308' : '#ef4444'}
                            strokeWidth="14" fill="none"
                            strokeDasharray={`${2 * Math.PI * 60}`}
                            strokeDashoffset={`${2 * Math.PI * 60 * (1 - (aiResult.overall_score || 0) / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-gray-900">{Math.round(aiResult.overall_score || 0)}</span>
                          <span className="text-xs text-gray-500">Overall</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-scores */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Content', score: aiResult.content_score },
                        { label: 'Vocabulary', score: aiResult.vocabulary_score },
                        { label: 'Grammar', score: aiResult.grammar_score },
                        { label: 'Fluency', score: aiResult.fluency_score },
                      ].map(({ label, score }) => (
                        <div key={label} className={`p-3 rounded-lg border text-center ${getScoreBg(score || 0)}`}>
                          <div className={`text-xl font-bold ${getScoreColor(score || 0)}`}>{Math.round(score || 0)}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Strengths */}
                    {aiResult.strengths && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-1">Strengths</p>
                        <p className="text-sm text-green-700">{aiResult.strengths}</p>
                      </div>
                    )}

                    {/* Suggestions */}
                    {aiResult.suggestions && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-1">Suggestions</p>
                        <p className="text-sm text-blue-700">{aiResult.suggestions}</p>
                      </div>
                    )}

                    {/* Sample improvement */}
                    {aiResult.sample_improvement && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm font-semibold text-purple-800 mb-1">Example improvement</p>
                        <p className="text-sm text-purple-700 italic">"{aiResult.sample_improvement}"</p>
                      </div>
                    )}

                    {/* Retry / Next */}
                    <div className="flex gap-3 justify-between pt-2">
                      <button
                        onClick={() => {
                          setTranscription('')
                          setAiResult(null)
                          setShowResults(false)
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                      <button
                        onClick={handleNextQuestion}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                      >
                        {currentQuestionIndex < questions.length - 1 ? (
                          <><span>Next</span><ArrowRight className="w-4 h-4" /></>
                        ) : (
                          <span>Finish</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default SpeakingAssessmentExercise

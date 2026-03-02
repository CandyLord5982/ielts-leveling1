import React, { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Copy, HelpCircle, X } from 'lucide-react'

const SpeakingAssessmentEditor = ({ questions, onQuestionsChange }) => {
  const normalizeQuestion = (q, idx = 0) => ({
    id: q?.id || `q${Date.now()}_${idx}`,
    prompt: q?.prompt || '',
    instructions: q?.instructions || '',
    key_points: q?.key_points || [],
    evaluation_criteria: q?.evaluation_criteria || 'content relevance, vocabulary range, grammar accuracy, fluency',
    time_limit: q?.time_limit || 0,
  })

  const [localQuestions, setLocalQuestions] = useState((questions || []).map(normalizeQuestion))
  const [collapsedQuestions, setCollapsedQuestions] = useState({})
  const [newKeyPoint, setNewKeyPoint] = useState({})

  useEffect(() => {
    setLocalQuestions((questions || []).map(normalizeQuestion))
  }, [questions])

  const updateAndNotify = (updated) => {
    setLocalQuestions(updated)
    onQuestionsChange(updated)
  }

  const addQuestion = () => {
    const q = normalizeQuestion({}, localQuestions.length)
    updateAndNotify([...localQuestions, q])
  }

  const removeQuestion = (index) => {
    updateAndNotify(localQuestions.filter((_, i) => i !== index))
  }

  const duplicateQuestion = (index) => {
    const copy = { ...localQuestions[index], id: `q${Date.now()}` }
    const updated = [...localQuestions]
    updated.splice(index + 1, 0, copy)
    updateAndNotify(updated)
  }

  const moveQuestion = (index, dir) => {
    const newIndex = dir === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= localQuestions.length) return
    const updated = [...localQuestions]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    updateAndNotify(updated)
  }

  const updateQuestion = (index, field, value) => {
    const updated = localQuestions.map((q, i) => i === index ? { ...q, [field]: value } : q)
    updateAndNotify(updated)
  }

  const addKeyPoint = (index) => {
    const text = (newKeyPoint[index] || '').trim()
    if (!text) return
    const updated = [...(localQuestions[index].key_points || []), text]
    updateQuestion(index, 'key_points', updated)
    setNewKeyPoint(prev => ({ ...prev, [index]: '' }))
  }

  const removeKeyPoint = (questionIndex, pointIndex) => {
    const updated = localQuestions[questionIndex].key_points.filter((_, i) => i !== pointIndex)
    updateQuestion(questionIndex, 'key_points', updated)
  }

  const toggleCollapse = (index) => {
    setCollapsedQuestions(prev => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Speaking Prompts</h3>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Prompt
        </button>
      </div>

      <div className="space-y-4">
        {localQuestions.map((question, index) => {
          const isCollapsed = collapsedQuestions[index]
          return (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Question header */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => toggleCollapse(index)} className="p-1 text-gray-600 hover:text-gray-900">
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    Prompt {index + 1}
                    {isCollapsed && question.prompt && (
                      <span className="ml-2 text-xs text-gray-500 truncate max-w-xs inline-block">
                        — {question.prompt.substring(0, 60)}{question.prompt.length > 60 ? '...' : ''}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveQuestion(index, 'up')} disabled={index === 0} className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => moveQuestion(index, 'down')} disabled={index === localQuestions.length - 1} className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => duplicateQuestion(index)} className="p-1 text-blue-600 hover:text-blue-800">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => removeQuestion(index)} className="p-1 text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-4">
                  {/* Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speaking Prompt <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={question.prompt}
                      onChange={(e) => updateQuestion(index, 'prompt', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      rows={2}
                      placeholder="e.g. Describe your hometown and what makes it special."
                    />
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Instructions <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={question.instructions}
                      onChange={(e) => updateQuestion(index, 'instructions', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g. Speak for 1-2 minutes. Include specific examples."
                    />
                  </div>

                  {/* Key points */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Key Points to Cover <span className="text-gray-400 text-xs">(shown as chips to the student)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {question.key_points?.map((kp, kpIdx) => (
                        <span key={kpIdx} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                          {kp}
                          <button type="button" onClick={() => removeKeyPoint(index, kpIdx)} className="ml-1 text-purple-500 hover:text-purple-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyPoint[index] || ''}
                        onChange={(e) => setNewKeyPoint(prev => ({ ...prev, [index]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyPoint(index) } }}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="e.g. Location, Culture, Food..."
                      />
                      <button type="button" onClick={() => addKeyPoint(index)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm">
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Evaluation criteria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI Evaluation Criteria
                    </label>
                    <input
                      type="text"
                      value={question.evaluation_criteria}
                      onChange={(e) => updateQuestion(index, 'evaluation_criteria', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="content relevance, vocabulary range, grammar accuracy, fluency"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tell the AI what to focus on when rating the response.</p>
                  </div>

                  {/* Time limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Limit (seconds)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="600"
                        value={question.time_limit}
                        onChange={(e) => updateQuestion(index, 'time_limit', parseInt(e.target.value) || 0)}
                        className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-600">
                        {question.time_limit === 0 ? 'No time limit' : `${question.time_limit} seconds`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Set to 0 for no limit. Recording auto-stops when time runs out.</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {localQuestions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <HelpCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No prompts yet. Click "Add Prompt" to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SpeakingAssessmentEditor

import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabase/client'
import { X, Save, AlertCircle } from 'lucide-react'
import FlashcardEditor from '../editors/FlashcardEditor'
import MultipleChoiceEditor from '../editors/MultipleChoiceEditor'
import FillBlankEditor from '../editors/FillBlankEditor'
import SmartDragDropEditor from '../editors/SmartDragDropEditor'
import AIFillBlankEditor from '../editors/AIFillBlankEditor'
import SimpleDropdownEditor from '../editors/SimpleDropdownEditor'
import PronunciationEditor from '../editors/PronunciationEditor'
import ImageHotspotEditor from '../editors/ImageHotspotEditor'
import SpeakingAssessmentEditor from '../editors/SpeakingAssessmentEditor'

const EditExerciseModal = ({ isOpen, onClose, exercise, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    exercise_type: 'flashcard',
    difficulty_level: 1,
    xp_reward: 10,
    estimated_duration: 5,
    tags: [],
    folder_id: null
  })
  const [content, setContent] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [folders, setFolders] = useState([])

  useEffect(() => {
    if (isOpen && exercise) {
      // Populate form with existing exercise data
      setFormData({
        title: exercise.title || '',
        description: exercise.description || '',
        exercise_type: exercise.exercise_type || 'flashcard',
        difficulty_level: exercise.difficulty_level || 1,
        xp_reward: exercise.xp_reward || 10,
        estimated_duration: exercise.estimated_duration || 5,
        tags: exercise.tags || [],
        folder_id: exercise.folder_id || null
      })
      setContent(exercise.content || {})
    }
  }, [isOpen, exercise])

  useEffect(() => {
    if (isOpen) {
      fetchFolders()
    }
  }, [isOpen])

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_folders')
        .select('*')
        .order('name')

      if (error) throw error
      setFolders(data || [])
    } catch (err) {
      console.error('Error fetching folders:', err)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleContentChange = (newContent) => {
    setContent(newContent)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required')
      }

      if (!content || Object.keys(content).length === 0) {
        throw new Error('Exercise content is required')
      }

      // Update exercise in database
      const { error } = await supabase
        .from('exercises')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          exercise_type: formData.exercise_type,
          difficulty_level: 1,
          xp_reward: formData.xp_reward,
          estimated_duration: 5,
          tags: [],
          folder_id: formData.folder_id,
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', exercise.id)

      if (error) throw error

      // Refresh the exercise list
      onUpdate()

      // Close modal
      onClose()

      alert('Exercise updated successfully!')
    } catch (err) {
      console.error('Error updating exercise:', err)
      setError(err.message || 'Failed to update exercise')
    } finally {
      setLoading(false)
    }
  }

  const handleTagChange = (e) => {
    const value = e.target.value
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag)
    setFormData(prev => ({
      ...prev,
      tags
    }))
  }

  const renderContentEditor = () => {
    switch (formData.exercise_type) {
      case 'flashcard':
        return (
          <FlashcardEditor
            cards={content.cards || content.flashcards || []}
            onCardsChange={(cards) => handleContentChange({ ...content, cards })}
          />
        )
      case 'multiple_choice':
        return (
          <MultipleChoiceEditor
            questions={content.questions || []}
            onQuestionsChange={(questions) => handleContentChange({ ...content, questions })}
            settings={content.settings || {}}
            onSettingsChange={(settings) => handleContentChange({ ...content, settings })}
            intro={content.intro || ''}
            onIntroChange={(intro) => handleContentChange({ ...content, intro })}
          />
        )
      case 'fill_blank':
        return (
          <FillBlankEditor
            questions={content.questions || []}
            onQuestionsChange={(questions) => handleContentChange({ ...content, questions })}
            settings={content.settings || {}}
            onSettingsChange={(settings) => handleContentChange({ ...content, settings })}
            intro={content.intro || ''}
            onIntroChange={(intro) => handleContentChange({ ...content, intro })}
          />
        )
      case 'drag_drop':
        return (
          <SmartDragDropEditor
            questions={content.questions || []}
            onQuestionsChange={(questions) => handleContentChange({ ...content, questions })}
          />
        )
      case 'dropdown':
        return (
          <SimpleDropdownEditor
            questions={content.questions || []}
            onQuestionsChange={(questions) => handleContentChange({ ...content, questions })}
          />
        )
      case 'pronunciation':
        return (
          <PronunciationEditor
            questions={content.questions || []}
            onQuestionsChange={(questions) => handleContentChange({ ...content, questions })}
          />
        )
      case 'ai_fill_blank':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Explanation Language</label>
                <select
                  value={(content?.settings?.language) || 'en'}
                  onChange={(e) => handleContentChange({
                    ...content,
                    settings: { ...(content?.settings || {}), language: e.target.value }
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </div>
            </div>
            <AIFillBlankEditor
              questions={content.questions || []}
              onQuestionsChange={(questions) => handleContentChange({ ...content, questions })}
              intro={content.intro || ''}
              onIntroChange={(intro) => handleContentChange({ ...content, intro })}
            />
          </>
        )
      case 'image_hotspot':
        return (
          <ImageHotspotEditor
            content={content}
            onContentChange={(newContent) => handleContentChange(newContent)}
          />
        )
      case 'speaking_assessment':
        return (
          <SpeakingAssessmentEditor
            questions={content.questions || []}
            onQuestionsChange={(questions) => handleContentChange({ ...content, questions })}
          />
        )
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>No editor available for this exercise type.</p>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Exercise</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter exercise title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercise Type
                </label>
                <select
                  value={formData.exercise_type}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                >
                  <option value="flashcard">Flashcard</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="fill_blank">Fill in the Blank</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="drag_drop">Drag & Drop</option>
                  <option value="ai_fill_blank">AI Fill Blank</option>
                  <option value="pronunciation">Pronunciation</option>
                  <option value="image_hotspot">Image Hotspot</option>
                  <option value="speaking_assessment">Speaking Assessment</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Exercise type cannot be changed after creation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder
                </label>
                <select
                  value={formData.folder_id || ''}
                  onChange={(e) => handleInputChange('folder_id', e.target.value || null)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No folder</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  XP Reward
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.xp_reward}
                  onChange={(e) => handleInputChange('xp_reward', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Content Editor */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Exercise Content</h3>
              {renderContentEditor()}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Exercise
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditExerciseModal

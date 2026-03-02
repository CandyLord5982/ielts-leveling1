import React, { useState } from 'react'
import { supabase } from '../../../supabase/client'
import { X, BookOpen, Edit3, Mic, HelpCircle, Tag, Copy, Brain, ChevronDown, Image } from 'lucide-react'
import FlashcardEditor from '../editors/FlashcardEditor'
import MultipleChoiceEditor from '../editors/MultipleChoiceEditor'
import FillBlankEditor from '../editors/FillBlankEditor'
import SmartDragDropEditor from '../editors/SmartDragDropEditor'
import AIFillBlankEditor from '../editors/AIFillBlankEditor'
import SimpleDropdownEditor from '../editors/SimpleDropdownEditor'
import PronunciationEditor from '../editors/PronunciationEditor'
import ImageHotspotEditor from '../editors/ImageHotspotEditor'
import SpeakingAssessmentEditor from '../editors/SpeakingAssessmentEditor'

const CreateExerciseModal = ({ folders, selectedFolder, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    exercise_type: 'flashcard',
    folder_id: selectedFolder?.id || '',
    difficulty_level: 1,
    xp_reward: 10,
    category: '',
    tags: [],
    estimated_duration: 5,
    content: {}
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')

  const exerciseTypes = [
    { value: 'flashcard', label: 'Flashcard', icon: BookOpen },
    { value: 'pronunciation', label: 'Pronunciation', icon: Mic },
    { value: 'fill_blank', label: 'Fill in the Blank', icon: Edit3 },
    { value: 'multiple_choice', label: 'Multiple Choice', icon: HelpCircle },
    { value: 'drag_drop', label: 'Drag & Drop', icon: Copy },
    { value: 'dropdown', label: 'Dropdown', icon: ChevronDown },
    { value: 'ai_fill_blank', label: 'Fill in AI Score', icon: Brain },
    { value: 'image_hotspot', label: 'Image Hotspot', icon: Image },
    { value: 'speaking_assessment', label: 'Speaking Assessment', icon: Mic }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase
        .from('exercises')
        .insert({
          title: formData.title.trim(),
          exercise_type: formData.exercise_type,
          content: formData.content,
          folder_id: formData.folder_id || null,
          difficulty_level: 1,
          xp_reward: formData.xp_reward,
          category: null,
          tags: null,
          estimated_duration: 5,
          is_in_bank: true,
          is_active: true,
          session_id: null, // Not assigned to session yet
          order_index: 0
        })

      if (error) throw error

      onCreated()
    } catch (err) {
      console.error('Error creating exercise:', err)
      setError(err.message || 'Failed to create exercise')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleContentChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: value
      }
    }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // Build folder options
  const buildFolderOptions = (folders, parentId = null, level = 0) => {
    return folders
      .filter(folder => folder.parent_folder_id === parentId)
      .flatMap(folder => [
        <option key={folder.id} value={folder.id}>
          {'  '.repeat(level) + folder.name}
        </option>,
        ...buildFolderOptions(folders, folder.id, level + 1)
      ])
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Create New Exercise
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Title and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exercise Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter exercise title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exercise Type *
              </label>
              <select
                value={formData.exercise_type}
                onChange={(e) => handleChange('exercise_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {exerciseTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Folder and XP Reward */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder
              </label>
              <select
                value={formData.folder_id}
                onChange={(e) => handleChange('folder_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No Folder</option>
                {buildFolderOptions(folders)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                XP Reward
              </label>
              <input
                type="number"
                value={formData.xp_reward}
                onChange={(e) => handleChange('xp_reward', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="100"
              />
            </div>
          </div>

          {/* Exercise Content Editors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Exercise Content
            </label>

            {formData.exercise_type === 'flashcard' && (
              <FlashcardEditor
                cards={formData.content.cards || []}
                onCardsChange={(cards) => handleContentChange('cards', cards)}
              />
            )}

            {formData.exercise_type === 'multiple_choice' && (
              <MultipleChoiceEditor
                questions={formData.content.questions || []}
                onQuestionsChange={(questions) => handleContentChange('questions', questions)}
                settings={formData.content.settings || {}}
                onSettingsChange={(settings) => handleContentChange('settings', settings)}
                intro={formData.content.intro || ''}
                onIntroChange={(intro) => handleContentChange('intro', intro)}
              />
            )}

            {formData.exercise_type === 'drag_drop' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">✅ Drag & Drop Exercise Editor</h4>
                  <p className="text-sm text-green-700">
                    Tạo câu hỏi kéo thả để sắp xếp từ, câu hoặc hình ảnh theo thứ tự đúng.
                  </p>
                </div>
                <SmartDragDropEditor
                  questions={formData.content.questions || []}
                  onQuestionsChange={(questions) => handleContentChange('questions', questions)}
                />
              </div>
            )}

            {formData.exercise_type === 'fill_blank' && (
              <FillBlankEditor
                questions={formData.content.questions || []}
                onQuestionsChange={(questions) => handleContentChange('questions', questions)}
                settings={formData.content.settings || {}}
                onSettingsChange={(settings) => handleContentChange('settings', settings)}
                intro={formData.content.intro || ''}
                onIntroChange={(intro) => handleContentChange('intro', intro)}
              />
            )}

            {formData.exercise_type === 'dropdown' && (
              <SimpleDropdownEditor
                questions={formData.content.questions || []}
                onQuestionsChange={(questions) => handleContentChange('questions', questions)}
              />
            )}

            {formData.exercise_type === 'pronunciation' && (
              <PronunciationEditor
                questions={formData.content.questions || []}
                onQuestionsChange={(questions) => handleContentChange('questions', questions)}
              />
            )}

            {formData.exercise_type === 'pronunciation' && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 text-center">
                  Pronunciation exercises can be configured after creation
                </p>
              </div>
            )}

            {formData.exercise_type === 'ai_fill_blank' && (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">🤖 AI Fill-in-the-Blank Exercise Editor</h4>
                  <p className="text-sm text-purple-700">
                    Create questions that use AI to intelligently score student answers.
                  </p>
                </div>
                {/* Language toggle for AI explanation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI Explanation Language
                    </label>
                    <select
                      value={formData?.content?.settings?.language || 'en'}
                      onChange={(e) => {
                        const currentSettings = formData?.content?.settings || {}
                        handleContentChange('settings', {
                          ...currentSettings,
                          language: e.target.value
                        })
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="en">English</option>
                      <option value="vi">Tiếng Việt</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Chọn ngôn ngữ giải thích của AI cho bài này.</p>
                  </div>
                </div>
                <AIFillBlankEditor
                  questions={formData.content.questions || []}
                  onQuestionsChange={(questions) => handleContentChange('questions', questions)}
                  intro={formData.content.intro || ''}
                  onIntroChange={(intro) => handleContentChange('intro', intro)}
                />
              </div>
            )}

            {formData.exercise_type === 'image_hotspot' && (
              <ImageHotspotEditor
                content={formData.content}
                onContentChange={(content) => setFormData({ ...formData, content })}
              />
            )}

            {formData.exercise_type === 'speaking_assessment' && (
              <SpeakingAssessmentEditor
                questions={formData.content.questions || []}
                onQuestionsChange={(questions) => handleContentChange('questions', questions)}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateExerciseModal
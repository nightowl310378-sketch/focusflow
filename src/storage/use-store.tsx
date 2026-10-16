import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react'

import type { FocusFlowData, ID, Subject, Task, Topic } from '@/domain/types'
import { loadData, saveData } from './storage'

interface StoreContextValue {
  data: FocusFlowData
  setData: (updater: (prev: FocusFlowData) => FocusFlowData) => void
  replaceData: (next: FocusFlowData) => void
  save: () => void
  touch: () => void
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }): JSX.Element {
  const [data, setDataState] = useState<FocusFlowData>(() => loadData())
  const [, force] = useState(0)

  const setData = useCallback((updater: (prev: FocusFlowData) => FocusFlowData) => {
    setDataState((prev) => {
      const next = updater(prev)
      saveData(next)
      return next
    })
  }, [])

  const replaceData = useCallback((next: FocusFlowData) => {
    setDataState(next)
    saveData(next)
  }, [])

  const save = useCallback(() => {
    saveData(data)
  }, [data])

  const touch = useCallback(() => force((v) => v + 1), [])

  useEffect(() => {
    saveData(data)
  }, [data, save])

  const value = useMemo(
    () => ({ data, setData, replaceData, save, touch }),
    [data, replaceData, save, setData, touch],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// Helper selectors that preserve immutability
export function withAddedSubject(data: FocusFlowData, subject: Subject): FocusFlowData {
  return { ...data, subjects: [...data.subjects, subject] }
}

export function withUpdatedSubject(
  data: FocusFlowData,
  subjectId: ID,
  update: Partial<Subject>,
): FocusFlowData {
  return {
    ...data,
    subjects: data.subjects.map((s) => (s.id === subjectId ? { ...s, ...update } : s)),
  }
}

export function withRemovedSubject(data: FocusFlowData, subjectId: ID): FocusFlowData {
  return {
    ...data,
    subjects: data.subjects.filter((s) => s.id !== subjectId),
    topics: data.topics.filter((t) => t.subjectId !== subjectId),
    tasks: data.tasks.map((t) => (t.subjectId === subjectId ? { ...t, subjectId: undefined } : t)),
    sessions: data.sessions.map((s) => (s.subjectId === subjectId ? { ...s, subjectId: undefined } : s)),
  }
}

export function withAddedTopic(data: FocusFlowData, topic: Topic): FocusFlowData {
  return { ...data, topics: [...data.topics, topic] }
}

export function withUpdatedTopic(
  data: FocusFlowData,
  topicId: ID,
  update: Partial<Topic>,
): FocusFlowData {
  return {
    ...data,
    topics: data.topics.map((t) => (t.id === topicId ? { ...t, ...update } : t)),
  }
}

export function withRemovedTopic(data: FocusFlowData, topicId: ID): FocusFlowData {
  return { ...data, topics: data.topics.filter((t) => t.id !== topicId) }
}

export function withUpsertTask(data: FocusFlowData, task: Task): FocusFlowData {
  const idx = data.tasks.findIndex((t) => t.id === task.id)
  if (idx === -1) return { ...data, tasks: [...data.tasks, task] }
  const nextTasks = [...data.tasks]
  nextTasks[idx] = task
  return { ...data, tasks: nextTasks }
}

export function withRemovedTask(data: FocusFlowData, taskId: ID): FocusFlowData {
  return { ...data, tasks: data.tasks.filter((t) => t.id !== taskId) }
}

export function withSessions(data: FocusFlowData, sessions: FocusFlowData['sessions']): FocusFlowData {
  return { ...data, sessions: sessions }
}

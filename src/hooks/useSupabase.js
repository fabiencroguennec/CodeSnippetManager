import { useState, useEffect } from 'react'
import { pagesService, consolesService, tagsService } from '../services/supabase'

export const useSupabase = () => {
  const [pages, setPages] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger les données initiales
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [pagesData, tagsData] = await Promise.all([
        pagesService.getAll(),
        tagsService.getAll()
      ])
      
      setPages(pagesData)
      setAvailableTags(tagsData)
    } catch (err) {
      setError(err.message)
      console.error('Erreur chargement données:', err)
    } finally {
      setLoading(false)
    }
  }

  // Actions pour les pages
  const createPage = async (pageData) => {
    try {
      const newPage = await pagesService.create(pageData)
      setPages(prev => [newPage, ...prev])
      await refreshTags()
      return newPage
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const updatePage = async (id, pageData) => {
    try {
      const updatedPage = await pagesService.update(id, pageData)
      setPages(prev => prev.map(p => p.id === id ? { ...p, ...updatedPage } : p))
      await refreshTags()
      return updatedPage
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const deletePage = async (id) => {
    try {
      await pagesService.delete(id)
      setPages(prev => prev.filter(p => p.id !== id))
      await refreshTags()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Actions pour les consoles
  const createConsole = async (consoleData) => {
    try {
      const newConsole = await consolesService.create(consoleData)
      setPages(prev => prev.map(p => 
        p.id === consoleData.page_id 
          ? { ...p, consoles: [...p.consoles, newConsole] }
          : p
      ))
      await refreshTags()
      return newConsole
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const updateConsole = async (id, consoleData) => {
    try {
      const updatedConsole = await consolesService.update(id, consoleData)
      setPages(prev => prev.map(p => ({
        ...p,
        consoles: p.consoles.map(c => c.id === id ? updatedConsole : c)
      })))
      await refreshTags()
      return updatedConsole
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const deleteConsole = async (id) => {
    try {
      await consolesService.delete(id)
      setPages(prev => prev.map(p => ({
        ...p,
        consoles: p.consoles.filter(c => c.id !== id)
      })))
      await refreshTags()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Actualiser les tags
  const refreshTags = async () => {
    try {
      const tags = await tagsService.getAll()
      setAvailableTags(tags)
    } catch (err) {
      console.error('Erreur refresh tags:', err)
    }
  }

  return {
    // État
    pages,
    availableTags,
    loading,
    error,
    
    // Actions
    loadData,
    createPage,
    updatePage,
    deletePage,
    createConsole,
    updateConsole,
    deleteConsole,
    refreshTags
  }
}
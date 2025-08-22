import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables d\'environnement Supabase manquantes')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Service pour les pages
export const pagesService = {
  // Récupérer toutes les pages avec leurs consoles
  async getAll() {
    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        consoles (*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Créer une nouvelle page
  async create(pageData) {
    const { data, error } = await supabase
      .from('pages')
      .insert([{
        title: pageData.title,
        tags: pageData.tags || []
      }])
      .select()
      .single()
    
    if (error) throw error
    return { ...data, consoles: [] }
  },

  // Mettre à jour une page
  async update(id, pageData) {
    const { data, error } = await supabase
      .from('pages')
      .update({
        title: pageData.title,
        tags: pageData.tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Supprimer une page
  async delete(id) {
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Service pour les consoles
export const consolesService = {
  // Créer une nouvelle console
  async create(consoleData) {
    const { data, error } = await supabase
      .from('consoles')
      .insert([{
        page_id: consoleData.page_id,
        code: consoleData.code || '',
        comment: consoleData.comment || 'Nouveau snippet',
        language: consoleData.language || 'javascript',
        tags: consoleData.tags || [],
        before_text: consoleData.before_text || '',
        after_text: consoleData.after_text || '',
        show_before_text: consoleData.show_before_text || false,
        show_after_text: consoleData.show_after_text || false
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Mettre à jour une console
  async update(id, consoleData) {
    const { data, error } = await supabase
      .from('consoles')
      .update({
        ...consoleData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Supprimer une console
  async delete(id) {
    const { error } = await supabase
      .from('consoles')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Service pour les tags
export const tagsService = {
  async getAll() {
    // Récupérer tous les tags des pages et consoles
    const [pagesResult, consolesResult] = await Promise.all([
      supabase.from('pages').select('tags'),
      supabase.from('consoles').select('tags')
    ])
    
    const allTags = new Set()
    
    // Ajouter les tags des pages
    pagesResult.data?.forEach(page => {
      page.tags?.forEach(tag => allTags.add(tag))
    })
    
    // Ajouter les tags des consoles
    consolesResult.data?.forEach(console => {
      console.tags?.forEach(tag => allTags.add(tag))
    })
    
    return Array.from(allTags).sort()
  }
}
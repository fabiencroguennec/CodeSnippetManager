import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const TestSupabase = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .limit(5)
      
      if (error) throw error
      setData(data)
      console.log('✅ Connexion Supabase réussie!', data)
    } catch (err) {
      setError(err.message)
      console.error('❌ Erreur Supabase:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Test de connexion...</div>
  if (error) return <div style={{color: 'red'}}>Erreur: {error}</div>

  return (
    <div style={{padding: '20px', border: '1px solid green'}}>
      <h3>✅ Connexion Supabase réussie!</h3>
      <p>Nombre de pages: {data?.length || 0}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default TestSupabase
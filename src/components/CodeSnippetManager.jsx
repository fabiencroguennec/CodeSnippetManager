import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Copy, Edit2, Trash2, Save, X, Code, FileText, Download, Upload, Moon, Sun, Tag, Filter } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';

const CodeSnippetManager = () => {
  // Hook Supabase
  const {
    pages,
    availableTags,
    loading,
    error,
    createPage,
    updatePage,
    deletePage,
    createConsole,
    updateConsole,
    deleteConsole
  } = useSupabase();

  // États locaux pour l'interface
  const [currentPage, setCurrentPage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [editingConsole, setEditingConsole] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // États pour éviter les conflits d'écriture
  const [localValues, setLocalValues] = useState({});
  const [updateTimeouts, setUpdateTimeouts] = useState({});

  const languages = [
    'javascript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 
    'rust', 'typescript', 'html', 'css', 'sql', 'bash', 'json', 'xml', 'yaml'
  ];

  // Recherche dynamique COMPLÈTE
  useEffect(() => {
    let filteredPages = pages;

    // Filtrer par tags sélectionnés
    if (selectedTags.length > 0) {
      filteredPages = pages.filter(page => {
        const pageTags = page.tags || [];
        const consoleTags = page.consoles.flatMap(c => c.tags || []);
        const allPageTags = [...pageTags, ...consoleTags];
        return selectedTags.some(tag => allPageTags.includes(tag));
      });
    }

    if (searchQuery.trim() === '') {
      setSearchResults(filteredPages);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = filteredPages.filter(page => {
      // Recherche dans le titre
      if (page.title.toLowerCase().includes(query)) return true;
      
      // Recherche dans les tags de page
      const pageTags = page.tags || [];
      if (pageTags.some(tag => tag.toLowerCase().includes(query))) return true;
      
      // Recherche dans les commentaires, code, tags et textes des consoles
      return page.consoles.some(console => {
        if (console.comment.toLowerCase().includes(query) ||
            console.code.toLowerCase().includes(query)) return true;
        
        const consoleTags = console.tags || [];
        if (consoleTags.some(tag => tag.toLowerCase().includes(query))) return true;
        
        if ((console.before_text && console.before_text.toLowerCase().includes(query)) ||
            (console.after_text && console.after_text.toLowerCase().includes(query))) return true;
        
        return false;
      });
    }).map(page => {
      const titleMatch = page.title.toLowerCase().includes(query);
      const pageTagsMatch = (page.tags || []).some(tag => tag.toLowerCase().includes(query));
      const consoleMatches = page.consoles.filter(console => 
        console.comment.toLowerCase().includes(query) ||
        console.code.toLowerCase().includes(query) ||
        (console.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
        (console.before_text && console.before_text.toLowerCase().includes(query)) ||
        (console.after_text && console.after_text.toLowerCase().includes(query))
      );
      
      let matchType = 'console';
      if (titleMatch) matchType = 'title';
      else if (pageTagsMatch) matchType = 'page-tags';
      
      return {
        ...page,
        matchType,
        matchingConsoles: consoleMatches
      };
    });

    setSearchResults(results);
  }, [searchQuery, pages, selectedTags]);

  // Fonction de mise à jour avec délai pour éviter les conflits
  const debouncedUpdate = useCallback((type, id, field, value, delay = 1000) => {
    // Mettre à jour localement immédiatement
    setLocalValues(prev => ({
      ...prev,
      [`${type}-${id}-${field}`]: value
    }));

    // Annuler l'ancien timeout
    const timeoutKey = `${type}-${id}-${field}`;
    if (updateTimeouts[timeoutKey]) {
      clearTimeout(updateTimeouts[timeoutKey]);
    }

    // Créer un nouveau timeout
    const newTimeout = setTimeout(async () => {
      try {
        if (type === 'page') {
          if (field === 'title') {
            await updatePage(id, { title: value, tags: currentPage.tags });
            if (currentPage && currentPage.id === id) {
              setCurrentPage({ ...currentPage, title: value });
            }
          } else if (field === 'tags') {
            await updatePage(id, { title: currentPage.title, tags: value });
            if (currentPage && currentPage.id === id) {
              setCurrentPage({ ...currentPage, tags: value });
            }
          }
        } else if (type === 'console') {
          const updates = { [field]: value };
          const updatedConsole = await updateConsole(id, updates);
          if (currentPage) {
            setCurrentPage({
              ...currentPage,
              consoles: currentPage.consoles.map(c => 
                c.id === id ? updatedConsole : c
              )
            });
          }
        }
      } catch (err) {
        console.error('Erreur mise à jour:', err);
      }

      // Nettoyer la valeur locale
      setLocalValues(prev => {
        const newValues = { ...prev };
        delete newValues[timeoutKey];
        return newValues;
      });
    }, delay);

    // Sauvegarder le timeout
    setUpdateTimeouts(prev => ({
      ...prev,
      [timeoutKey]: newTimeout
    }));
  }, [updatePage, updateConsole, currentPage]);

  // Fonctions optimisées
  const handleCreatePage = async () => {
    try {
      const newPage = await createPage({
        title: 'Nouvelle Page',
        tags: []
      });
      setCurrentPage(newPage);
      setShowSearch(false);
      setEditingPage(newPage.id);
    } catch (err) {
      alert('Erreur lors de la création de la page: ' + err.message);
    }
  };

  const handleAddConsole = async (pageId) => {
    try {
      const newConsole = await createConsole({
        page_id: pageId,
        code: '',
        comment: 'Nouveau snippet',
        language: 'javascript',
        tags: [],
        before_text: '',
        after_text: '',
        show_before_text: false,
        show_after_text: false
      });
      
      if (currentPage && currentPage.id === pageId) {
        setCurrentPage({
          ...currentPage,
          consoles: [...currentPage.consoles, newConsole]
        });
      }
      
      setEditingConsole(newConsole.id);
    } catch (err) {
      alert('Erreur lors de la création de la console: ' + err.message);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette page ?')) return;
    
    try {
      await deletePage(pageId);
      if (currentPage && currentPage.id === pageId) {
        setCurrentPage(null);
        setShowSearch(true);
      }
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  const handleDeleteConsole = async (consoleId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette console ?')) return;
    
    try {
      await deleteConsole(consoleId);
      
      if (currentPage) {
        setCurrentPage({
          ...currentPage,
          consoles: currentPage.consoles.filter(c => c.id !== consoleId)
        });
      }
    } catch (err) {
      alert('Erreur lors de la suppression: ' + err.message);
    }
  };

  const toggleTextSection = async (pageId, consoleId, section) => {
    const console = currentPage.consoles.find(c => c.id === consoleId);
    const fieldName = section === 'before' ? 'show_before_text' : 'show_after_text';
    const newValue = !console[fieldName];
    
    try {
      const updatedConsole = await updateConsole(consoleId, { [fieldName]: newValue });
      setCurrentPage({
        ...currentPage,
        consoles: currentPage.consoles.map(c => 
          c.id === consoleId ? updatedConsole : c
        )
      });
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Code copié dans le presse-papiers !');
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const openPage = (page) => {
    setCurrentPage(page);
    setShowSearch(false);
    setSearchQuery('');
  };

  const goHome = () => {
    setCurrentPage(null);
    setShowSearch(true);
    setEditingPage(null);
    setEditingConsole(null);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addTag = async (target, id, newTag) => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;
    
    try {
      if (target === 'page') {
        const currentTags = currentPage.tags || [];
        if (!currentTags.includes(trimmedTag)) {
          const newTags = [...currentTags, trimmedTag];
          await updatePage(id, { title: currentPage.title, tags: newTags });
          setCurrentPage({ ...currentPage, tags: newTags });
        }
      } else if (target === 'console') {
        const console = currentPage.consoles.find(c => c.id === id);
        if (console) {
          const currentTags = console.tags || [];
          if (!currentTags.includes(trimmedTag)) {
            const newTags = [...currentTags, trimmedTag];
            const updatedConsole = await updateConsole(id, { tags: newTags });
            setCurrentPage({
              ...currentPage,
              consoles: currentPage.consoles.map(c => 
                c.id === id ? updatedConsole : c
              )
            });
          }
        }
      }
    } catch (err) {
      alert('Erreur lors de l\'ajout du tag: ' + err.message);
    }
  };

  const removeTag = async (target, id, tagToRemove) => {
    try {
      if (target === 'page') {
        const currentTags = currentPage.tags || [];
        const newTags = currentTags.filter(t => t !== tagToRemove);
        await updatePage(id, { title: currentPage.title, tags: newTags });
        setCurrentPage({ ...currentPage, tags: newTags });
      } else if (target === 'console') {
        const console = currentPage.consoles.find(c => c.id === id);
        const currentTags = console.tags || [];
        const newTags = currentTags.filter(t => t !== tagToRemove);
        const updatedConsole = await updateConsole(id, { tags: newTags });
        setCurrentPage({
          ...currentPage,
          consoles: currentPage.consoles.map(c => 
            c.id === id ? updatedConsole : c
          )
        });
      }
    } catch (err) {
      alert('Erreur lors de la suppression du tag: ' + err.message);
    }
  };

  // Fonction pour obtenir la valeur (locale ou serveur)
  const getValue = (type, id, field, defaultValue = '') => {
    const localKey = `${type}-${id}-${field}`;
    return localValues[localKey] !== undefined ? localValues[localKey] : defaultValue;
  };

  const getSyntaxHighlightClass = (language) => {
    const languageClasses = {
      javascript: 'text-yellow-300',
      python: 'text-blue-300',
      java: 'text-orange-300',
      cpp: 'text-blue-400',
      csharp: 'text-purple-300',
      php: 'text-indigo-300',
      ruby: 'text-red-300',
      go: 'text-cyan-300',
      rust: 'text-orange-400',
      typescript: 'text-blue-300',
      html: 'text-orange-300',
      css: 'text-blue-300',
      sql: 'text-green-300',
      bash: 'text-gray-300',
      json: 'text-yellow-200',
      xml: 'text-green-300',
      yaml: 'text-purple-300'
    };
    return languageClasses[language] || 'text-green-400';
  };

  const themeClasses = darkMode ? {
    bg: 'bg-gray-900',
    cardBg: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    border: 'border-gray-700',
    input: 'bg-gray-700 text-white border-gray-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    consoleBg: 'bg-black'
  } : {
    bg: 'bg-gray-50',
    cardBg: 'bg-white',
    text: 'text-gray-800',
    textSecondary: 'text-gray-600',
    border: 'border-gray-300',
    input: 'bg-white text-gray-800 border-gray-300',
    button: 'bg-blue-500 hover:bg-blue-600',
    consoleBg: 'bg-gray-900'
  };

  // Conditions de retour
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données partagées...</p>
          <p className="text-sm text-gray-500 mt-2">Connexion à la base de données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Erreur de connexion:</strong>
            <p className="mt-2">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Interface principale - Page de recherche
  if (showSearch || !currentPage) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} p-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-1">
              <h1 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>
                <Code className="inline-block mr-2" />
                Gestionnaire de Snippets
              </h1>
              <p className={themeClasses.textSecondary}>
                Base de données partagée • {pages.length} pages • {availableTags.length} tags
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="relative mb-4">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${themeClasses.textSecondary} w-5 h-5`} />
            <input
              type="text"
              placeholder="Rechercher dans les titres, tags, commentaires et code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 ${themeClasses.input} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg`}
            />
          </div>

          {/* Filtres par tags */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border`}
              >
                <Filter className="w-4 h-4" />
                Filtrer par tags ({selectedTags.length})
              </button>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Effacer filtres
                </button>
              )}
            </div>
            
            {showTagFilter && availableTags.length > 0 && (
              <div className={`p-4 rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border`}>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : `${themeClasses.cardBg} ${themeClasses.border} ${themeClasses.text}`
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center mb-8">
            <button
              onClick={handleCreatePage}
              className={`${themeClasses.button} text-white px-6 py-3 rounded-lg flex items-center mx-auto gap-2 transition-colors`}
            >
              <Plus className="w-5 h-5" />
              Créer une nouvelle page
            </button>
          </div>

          {/* Résultats */}
          <div className="space-y-4">
            {(searchQuery || selectedTags.length > 0) ? (
              searchResults.length > 0 ? (
                <>
                  <h2 className={`text-xl font-semibold ${themeClasses.text}`}>
                    Résultats ({searchResults.length})
                  </h2>
                  {searchResults.map(page => (
                    <div key={page.id} className={`${themeClasses.cardBg} rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${themeClasses.border} border`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className={`text-lg font-medium ${themeClasses.text} mb-2 cursor-pointer hover:text-blue-600`}
                              onClick={() => openPage(page)}>
                            <FileText className="inline-block w-4 h-4 mr-2" />
                            {page.title}
                          </h3>
                          <p className={`text-sm ${themeClasses.textSecondary} mb-2`}>
                            {page.consoles.length} console{page.consoles.length > 1 ? 's' : ''}
                          </p>
                          {page.tags && page.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {page.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {page.consoles.some(c => c.tags && c.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className={`text-xs ${themeClasses.textSecondary} mr-1`}>Console tags:</span>
                              {page.consoles.flatMap(c => c.tags || [])
                                .filter((tag, index, arr) => arr.indexOf(tag) === index)
                                .map(tag => (
                                <span key={tag} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {page.matchType === 'page-tags' && (
                            <div className="text-sm text-purple-600 mb-2">
                              Correspondance dans les tags de la page
                            </div>
                          )}
                          {page.matchType === 'console' && (
                            <div className="text-sm text-blue-600">
                              Correspondances dans: {page.matchingConsoles.map(c => c.comment).join(', ')}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePage(page.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className={`text-center ${themeClasses.textSecondary} py-8`}>
                  Aucun résultat trouvé pour "{searchQuery}"
                  {selectedTags.length > 0 && ` avec les tags: ${selectedTags.join(', ')}`}
                </div>
              )
            ) : (
              pages.length > 0 ? (
                <>
                  <h2 className={`text-xl font-semibold ${themeClasses.text}`}>
                    Toutes les pages ({pages.length})
                  </h2>
                  {pages.map(page => (
                    <div key={page.id} className={`${themeClasses.cardBg} rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${themeClasses.border} border`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className={`text-lg font-medium ${themeClasses.text} mb-2 cursor-pointer hover:text-blue-600`}
                              onClick={() => openPage(page)}>
                            <FileText className="inline-block w-4 h-4 mr-2" />
                            {page.title}
                          </h3>
                          <p className={`text-sm ${themeClasses.textSecondary} mb-2`}>
                            {page.consoles.length} console{page.consoles.length > 1 ? 's' : ''}
                          </p>
                          {page.tags && page.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {page.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {page.consoles.some(c => c.tags && c.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className={`text-xs ${themeClasses.textSecondary} mr-1`}>Console tags:</span>
                              {page.consoles.flatMap(c => c.tags || [])
                                .filter((tag, index, arr) => arr.indexOf(tag) === index)
                                .map(tag => (
                                <span key={tag} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeletePage(page.id)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className={`text-center ${themeClasses.textSecondary} py-8`}>
                  Aucune page dans la base de données. Créez la première !
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // Interface console avec optimisations
  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      <nav className={`${themeClasses.cardBg} shadow-sm border-b ${themeClasses.border} p-4`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={goHome}
            className="text-blue-500 hover:text-blue-600 flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            Retour à la recherche
          </button>
          
          <div className="flex items-center gap-4">
            {editingPage === currentPage.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getValue('page', currentPage.id, 'title', currentPage.title)}
                  onChange={(e) => debouncedUpdate('page', currentPage.id, 'title', e.target.value)}
                  className={`text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none ${themeClasses.text}`}
                  autoFocus
                />
                <button
                  onClick={() => setEditingPage(null)}
                  className="text-green-500 hover:text-green-600 p-1"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold ${themeClasses.text}`}>{currentPage.title}</h1>
                <button
                  onClick={() => setEditingPage(currentPage.id)}
                  className={`${themeClasses.textSecondary} hover:text-gray-700 p-1`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => handleAddConsole(currentPage.id)}
              className={`${themeClasses.button} text-white px-4 py-2 rounded-lg flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Ajouter Console
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tags de la page */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4" />
            <span className={`text-sm font-medium ${themeClasses.text}`}>Tags de la page:</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {(currentPage.tags || []).map(tag => (
              <span key={tag} className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full flex items-center gap-1">
                {tag}
                <button
                  onClick={() => removeTag('page', currentPage.id, tag)}
                  className="hover:text-red-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Ajouter un tag..."
                className={`px-3 py-1 text-sm rounded-full ${themeClasses.input} border`}
                onKeyPress={(e) => {
                 if (e.key === 'Enter') {
                   addTag('page', currentPage.id, e.target.value);
                   e.target.value = '';
                 }
               }}
               id="page-tag-input"
             />
             <button
               onClick={() => {
                 const input = document.getElementById('page-tag-input');
                 if (input && input.value.trim()) {
                   addTag('page', currentPage.id, input.value);
                   input.value = '';
                 }
               }}
               className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
             >
               +
             </button>
           </div>
         </div>
       </div>

       {/* Consoles */}
       {currentPage.consoles.length === 0 ? (
         <div className="text-center py-12">
           <Code className={`w-16 h-16 mx-auto ${themeClasses.textSecondary} mb-4`} />
           <h3 className={`text-xl font-medium ${themeClasses.textSecondary} mb-2`}>Aucune console pour le moment</h3>
           <p className={`${themeClasses.textSecondary} mb-4`}>Ajoutez votre première console de code pour commencer</p>
           <button
             onClick={() => handleAddConsole(currentPage.id)}
             className={`${themeClasses.button} text-white px-6 py-3 rounded-lg flex items-center mx-auto gap-2`}
           >
             <Plus className="w-5 h-5" />
             Ajouter ma première console
           </button>
         </div>
       ) : (
         <div className="grid gap-6">
           {currentPage.consoles.map(console => (
             <div key={console.id} className={`${themeClasses.cardBg} rounded-lg shadow-md overflow-hidden ${themeClasses.border} border`}>
               
               {/* Zone de texte avant la console */}
               {console.show_before_text && (
                 <div className={`p-4 border-b ${themeClasses.border}`}>
                   <textarea
                     value={getValue('console', console.id, 'before_text', console.before_text)}
                     onChange={(e) => debouncedUpdate('console', console.id, 'before_text', e.target.value)}
                     placeholder="Texte avant le code (contexte, instructions...)..."
                     className={`w-full p-3 ${themeClasses.input} border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                     rows="3"
                   />
                 </div>
               )}

               {/* En-tête de la console */}
               <div className={`${themeClasses.consoleBg} text-white p-4`}>
                 <div className="flex justify-between items-start mb-2">
                   {editingConsole === console.id ? (
                     <input
                       type="text"
                       value={getValue('console', console.id, 'comment', console.comment)}
                       onChange={(e) => debouncedUpdate('console', console.id, 'comment', e.target.value, 500)}
                       className="bg-gray-700 text-white px-3 py-1 rounded flex-1 mr-4 focus:outline-none focus:bg-gray-600"
                       autoFocus
                       onBlur={() => setEditingConsole(null)}
                       onKeyPress={(e) => e.key === 'Enter' && setEditingConsole(null)}
                     />
                   ) : (
                     <h3 
                       className="font-medium cursor-pointer hover:text-gray-200 flex-1"
                       onClick={() => setEditingConsole(console.id)}
                     >
                       {console.comment}
                     </h3>
                   )}
                   
                   <div className="flex items-center gap-2">
                     {/* Boutons avant/après */}
                     <button
                       onClick={() => toggleTextSection(currentPage.id, console.id, 'before')}
                       className={`px-2 py-1 rounded text-xs ${
                         console.show_before_text 
                           ? 'bg-green-600 text-white' 
                           : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                       }`}
                       title={console.show_before_text ? "Masquer texte avant" : "Ajouter texte avant"}
                     >
                       Avant
                     </button>
                     
                     <button
                       onClick={() => toggleTextSection(currentPage.id, console.id, 'after')}
                       className={`px-2 py-1 rounded text-xs ${
                         console.show_after_text 
                           ? 'bg-green-600 text-white' 
                           : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                       }`}
                       title={console.show_after_text ? "Masquer texte après" : "Ajouter texte après"}
                     >
                       Après
                     </button>
                     
                     {/* Sélecteur de langage */}
                     <select
                       value={console.language || 'javascript'}
                       onChange={(e) => debouncedUpdate('console', console.id, 'language', e.target.value, 0)}
                       className="bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:bg-gray-600"
                     >
                       {languages.map(lang => (
                         <option key={lang} value={lang}>{lang}</option>
                       ))}
                     </select>
                     
                     {/* Boutons action */}
                     <button
                       onClick={() => copyToClipboard(console.code)}
                       className="text-gray-300 hover:text-white p-1 rounded hover:bg-gray-700"
                       title="Copier le code"
                     >
                       <Copy className="w-4 h-4" />
                     </button>
                     <button
                       onClick={() => handleDeleteConsole(console.id)}
                       className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-700"
                       title="Supprimer la console"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
                 
                 {/* Tags de la console */}
                 <div className="flex flex-wrap gap-1 mb-2 items-center">
                   {(console.tags || []).map(tag => (
                     <span key={tag} className="px-2 py-1 bg-gray-600 text-white text-xs rounded flex items-center gap-1">
                       {tag}
                       <button
                         onClick={() => removeTag('console', console.id, tag)}
                         className="hover:text-red-200"
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </span>
                   ))}
                   <div className="flex items-center gap-1">
                     <input
                       type="text"
                       placeholder="Tag..."
                       className="px-2 py-1 bg-gray-700 text-white text-xs rounded border-none focus:outline-none focus:bg-gray-600"
                       onKeyPress={(e) => {
                         if (e.key === 'Enter') {
                           addTag('console', console.id, e.target.value);
                           e.target.value = '';
                         }
                       }}
                       id={`console-tag-input-${console.id}`}
                     />
                     <button
                       onClick={() => {
                         const input = document.getElementById(`console-tag-input-${console.id}`);
                         if (input && input.value.trim()) {
                           addTag('console', console.id, input.value);
                           input.value = '';
                         }
                       }}
                       className="bg-gray-600 hover:bg-gray-500 text-white rounded w-4 h-4 flex items-center justify-center text-xs font-bold"
                     >
                       +
                     </button>
                   </div>
                 </div>
               </div>
               
               {/* Zone de code */}
               <div className="p-0">
                 <textarea
                   value={getValue('console', console.id, 'code', console.code)}
                   onChange={(e) => debouncedUpdate('console', console.id, 'code', e.target.value)}
                   placeholder="Entrez votre code ici..."
                   className={`w-full h-40 p-4 font-mono text-sm ${themeClasses.consoleBg} ${getSyntaxHighlightClass(console.language || 'javascript')} border-none resize-none focus:outline-none`}
                   style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
                 />
               </div>

               {/* Zone de texte après la console */}
               {console.show_after_text && (
                 <div className={`p-4 border-t ${themeClasses.border}`}>
                   <textarea
                     value={getValue('console', console.id, 'after_text', console.after_text)}
                     onChange={(e) => debouncedUpdate('console', console.id, 'after_text', e.target.value)}
                     placeholder="Texte après le code (notes, explications, résultats attendus...)..."
                     className={`w-full p-3 ${themeClasses.input} border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                     rows="3"
                   />
                 </div>
               )}
             </div>
           ))}
         </div>
       )}
     </div>
   </div>
 );
};

export default CodeSnippetManager;

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Copy, Edit2, Trash2, Save, X, Code, FileText, Download, Upload, Moon, Sun, Tag, Filter } from 'lucide-react';

const CodeSnippetManager = () => {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [editingConsole, setEditingConsole] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const fileInputRef = useRef(null);

  const languages = [
    'javascript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 
    'rust', 'typescript', 'html', 'css', 'sql', 'bash', 'json', 'xml', 'yaml'
  ];

  const isLocalStorageAvailable = () => {
    try {
      if (typeof window === 'undefined') return false;
      if (!window.localStorage) return false;
      const testKey = '__test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('localStorage non disponible:', e);
      return false;
    }
  };

  const getFromStorage = (key, defaultValue = null) => {
    if (!isLocalStorageAvailable()) return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Erreur lecture storage:', error);
      return defaultValue;
    }
  };

  const setToStorage = (key, value) => {
    if (!isLocalStorageAvailable()) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Erreur sauvegarde storage:', error);
      return false;
    }
  };

  useEffect(() => {
    try {
      const savedPages = getFromStorage('codeSnippetPages', []);
      const savedDarkMode = getFromStorage('darkMode', false);
      const savedTags = getFromStorage('availableTags', []);
      
      if (savedPages && Array.isArray(savedPages) && savedPages.length > 0) {
        const normalizedPages = savedPages.map(page => ({
          ...page,
          tags: page.tags || [],
          consoles: (page.consoles || []).map(console => ({
            ...console,
            tags: console.tags || [],
            beforeText: console.beforeText || '',
            afterText: console.afterText || '',
            language: console.language || 'javascript',
            showBeforeText: Boolean(console.beforeText) || Boolean(console.showBeforeText),
            showAfterText: Boolean(console.afterText) || Boolean(console.showAfterText)
          }))
        }));
        setPages(normalizedPages);
        updateAvailableTags(normalizedPages);
      }
      
      if (savedTags && Array.isArray(savedTags)) {
        setAvailableTags(savedTags);
      }
      
      if (typeof savedDarkMode === 'boolean') {
        setDarkMode(savedDarkMode);
      }
    } catch (error) {
      console.warn('Erreur chargement initial:', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (pages.length > 0) {
        setToStorage('codeSnippetPages', pages);
        updateAvailableTags(pages);
      }
    } catch (error) {
      console.warn('Erreur sauvegarde pages:', error);
    }
  }, [pages]);

  useEffect(() => {
    try {
      setToStorage('darkMode', darkMode);
    } catch (error) {
      console.warn('Erreur sauvegarde theme:', error);
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      if (availableTags.length > 0) {
        setToStorage('availableTags', availableTags);
      }
    } catch (error) {
      console.warn('Erreur sauvegarde tags:', error);
    }
  }, [availableTags]);

  const updateAvailableTags = (pagesList) => {
    const allTags = new Set();
    pagesList.forEach(page => {
      if (page.tags && Array.isArray(page.tags)) {
        page.tags.forEach(tag => {
          if (tag && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
      if (page.consoles && Array.isArray(page.consoles)) {
        page.consoles.forEach(console => {
          if (console.tags && Array.isArray(console.tags)) {
            console.tags.forEach(tag => {
              if (tag && tag.trim()) {
                allTags.add(tag.trim());
              }
            });
          }
        });
      }
    });
    const tagsArray = Array.from(allTags).sort();
    setAvailableTags(tagsArray);
  };

  useEffect(() => {
    let filteredPages = pages;

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
      if (page.title.toLowerCase().includes(query)) return true;
      
      const pageTags = page.tags || [];
      if (pageTags.some(tag => tag.toLowerCase().includes(query))) return true;
      
      return page.consoles.some(console => {
        if (console.comment.toLowerCase().includes(query) ||
            console.code.toLowerCase().includes(query)) return true;
        
        const consoleTags = console.tags || [];
        if (consoleTags.some(tag => tag.toLowerCase().includes(query))) return true;
        
        if ((console.beforeText && console.beforeText.toLowerCase().includes(query)) ||
            (console.afterText && console.afterText.toLowerCase().includes(query))) return true;
        
        return false;
      });
    }).map(page => {
      const titleMatch = page.title.toLowerCase().includes(query);
      const pageTagsMatch = (page.tags || []).some(tag => tag.toLowerCase().includes(query));
      const consoleMatches = page.consoles.filter(console => 
        console.comment.toLowerCase().includes(query) ||
        console.code.toLowerCase().includes(query) ||
        (console.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
        (console.beforeText && console.beforeText.toLowerCase().includes(query)) ||
        (console.afterText && console.afterText.toLowerCase().includes(query))
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

  const createNewPage = () => {
    const newPage = {
      id: Date.now(),
      title: 'Nouvelle Page',
      tags: [],
      consoles: []
    };
    const updatedPages = [...pages, newPage];
    setPages(updatedPages);
    setCurrentPage(newPage);
    setShowSearch(false);
    setEditingPage(newPage.id);
  };

  const deletePage = (pageId) => {
    setPages(pages.filter(p => p.id !== pageId));
    if (currentPage && currentPage.id === pageId) {
      setCurrentPage(null);
      setShowSearch(true);
    }
  };

  const updatePageTitle = (pageId, newTitle) => {
    setPages(pages.map(p => 
      p.id === pageId ? { ...p, title: newTitle } : p
    ));
    if (currentPage && currentPage.id === pageId) {
      setCurrentPage({ ...currentPage, title: newTitle });
    }
  };

  const updatePageTags = (pageId, newTags) => {
    setPages(pages.map(p => 
      p.id === pageId ? { ...p, tags: newTags } : p
    ));
    if (currentPage && currentPage.id === pageId) {
      setCurrentPage({ ...currentPage, tags: newTags });
    }
  };

  const addConsole = (pageId) => {
    const newConsole = {
      id: Date.now(),
      code: '',
      comment: 'Nouveau snippet',
      language: 'javascript',
      tags: [],
      beforeText: '',
      afterText: '',
      showBeforeText: false,
      showAfterText: false
    };
    
    const updatedPages = pages.map(p => 
      p.id === pageId 
        ? { ...p, consoles: [...p.consoles, newConsole] }
        : p
    );
    setPages(updatedPages);
    
    if (currentPage && currentPage.id === pageId) {
      setCurrentPage({
        ...currentPage,
        consoles: [...currentPage.consoles, newConsole]
      });
    }
    
    setEditingConsole(newConsole.id);
  };

  const updateConsole = (pageId, consoleId, updates) => {
    setPages(pages.map(p => 
      p.id === pageId 
        ? {
            ...p, 
            consoles: p.consoles.map(c => 
              c.id === consoleId ? { ...c, ...updates } : c
            )
          }
        : p
    ));
    
    if (currentPage && currentPage.id === pageId) {
      setCurrentPage({
        ...currentPage,
        consoles: currentPage.consoles.map(c => 
          c.id === consoleId ? { ...c, ...updates } : c
        )
      });
    }
  };

  const toggleTextSection = (pageId, consoleId, section) => {
    const fieldName = section === 'before' ? 'showBeforeText' : 'showAfterText';
    const console = currentPage.consoles.find(c => c.id === consoleId);
    const newValue = !console[fieldName];
    
    updateConsole(pageId, consoleId, { [fieldName]: newValue });
  };

  const deleteConsole = (pageId, consoleId) => {
    setPages(pages.map(p => 
      p.id === pageId 
        ? { ...p, consoles: p.consoles.filter(c => c.id !== consoleId) }
        : p
    ));
    
    if (currentPage && currentPage.id === pageId) {
      setCurrentPage({
        ...currentPage,
        consoles: currentPage.consoles.filter(c => c.id !== consoleId)
      });
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

  const exportData = () => {
    const dataToExport = {
      pages,
      availableTags,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-snippets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.pages && Array.isArray(importedData.pages)) {
          setPages(importedData.pages);
          if (importedData.availableTags) {
            setAvailableTags(importedData.availableTags);
          }
          alert('Données importées avec succès !');
        } else {
          alert('Format de fichier invalide.');
        }
      } catch (error) {
        alert('Erreur lors de l\'importation du fichier.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
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

  const addTag = (target, id, newTag) => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;
    
    if (target === 'page') {
      const currentTags = currentPage.tags || [];
      if (!currentTags.includes(trimmedTag)) {
        const newTags = [...currentTags, trimmedTag];
        updatePageTags(currentPage.id, newTags);
        setTimeout(() => updateAvailableTags(pages.map(p => 
          p.id === currentPage.id ? { ...p, tags: newTags } : p
        )), 100);
      }
    } else if (target === 'console') {
      const console = currentPage.consoles.find(c => c.id === id);
      if (console) {
        const currentTags = console.tags || [];
        if (!currentTags.includes(trimmedTag)) {
          const newTags = [...currentTags, trimmedTag];
          updateConsole(currentPage.id, id, { tags: newTags });
          setTimeout(() => {
            const updatedPages = pages.map(p => 
              p.id === currentPage.id 
                ? {
                    ...p, 
                    consoles: p.consoles.map(c => 
                      c.id === id ? { ...c, tags: newTags } : c
                    )
                  }
                : p
            );
            updateAvailableTags(updatedPages);
          }, 100);
        }
      }
    }
  };

  const removeTag = (target, id, tagToRemove) => {
    if (target === 'page') {
      const currentTags = currentPage.tags || [];
      updatePageTags(currentPage.id, currentTags.filter(t => t !== tagToRemove));
    } else if (target === 'console') {
      const console = currentPage.consoles.find(c => c.id === id);
      const currentTags = console.tags || [];
      updateConsole(currentPage.id, id, { tags: currentTags.filter(t => t !== tagToRemove) });
    }
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
              <p className={themeClasses.textSecondary}>Organisez et retrouvez facilement vos bouts de code</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button
                onClick={exportData}
                className={`p-2 rounded-lg ${themeClasses.button} text-white`}
                title="Exporter les données"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-lg ${themeClasses.button} text-white`}
                title="Importer les données"
              >
                <Upload className="w-5 h-5" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </div>
          </div>

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
              onClick={createNewPage}
              className={`${themeClasses.button} text-white px-6 py-3 rounded-lg flex items-center mx-auto gap-2 transition-colors`}
            >
              <Plus className="w-5 h-5" />
              Créer une nouvelle page
            </button>
          </div>

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
                          onClick={() => deletePage(page.id)}
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
                  Aucun résultat trouvé
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
                          onClick={() => deletePage(page.id)}
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
                  Aucune page créée. Commencez par créer votre première page !
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

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
                  value={currentPage.title}
                  onChange={(e) => updatePageTitle(currentPage.id, e.target.value)}
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
              onClick={() => addConsole(currentPage.id)}
              className={`${themeClasses.button} text-white px-4 py-2 rounded-lg flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Ajouter Console
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
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

        {currentPage.consoles.length === 0 ? (
          <div className="text-center py-12">
            <Code className={`w-16 h-16 mx-auto ${themeClasses.textSecondary} mb-4`} />
            <h3 className={`text-xl font-medium ${themeClasses.textSecondary} mb-2`}>Aucune console pour le moment</h3>
            <p className={`${themeClasses.textSecondary} mb-4`}>Ajoutez votre première console de code pour commencer</p>
            <button
              onClick={() => addConsole(currentPage.id)}
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
                
                {console.showBeforeText && (
                  <div className={`p-4 border-b ${themeClasses.border}`}>
                    <textarea
                      value={console.beforeText || ''}
                      onChange={(e) => updateConsole(currentPage.id, console.id, { beforeText: e.target.value })}
                      placeholder="Texte avant le code (contexte, instructions...)..."
                      className={`w-full p-3 ${themeClasses.input} border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      rows="3"
                    />
                  </div>
                )}

                <div className={`${themeClasses.consoleBg} text-white p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    {editingConsole === console.id ? (
                      <input
                        type="text"
                        value={console.comment}
                        onChange={(e) => updateConsole(currentPage.id, console.id, { comment: e.target.value })}
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
                      <button
                        onClick={() => toggleTextSection(currentPage.id, console.id, 'before')}
                        className={`px-2 py-1 rounded text-xs ${
                          console.showBeforeText 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                        }`}
                        title={console.showBeforeText ? "Masquer texte avant" : "Ajouter texte avant"}
                      >
                        Avant
                      </button>
                      
                      <button
                        onClick={() => toggleTextSection(currentPage.id, console.id, 'after')}
                        className={`px-2 py-1 rounded text-xs ${
                          console.showAfterText 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                        }`}
                        title={console.showAfterText ? "Masquer texte après" : "Ajouter texte après"}
                      >
                        Après
                      </button>
                      
                      <select
                        value={console.language || 'javascript'}
                        onChange={(e) => updateConsole(currentPage.id, console.id, { language: e.target.value })}
                        className="bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:bg-gray-600"
                      >
                        {languages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => copyToClipboard(console.code)}
                        className="text-gray-300 hover:text-white p-1 rounded hover:bg-gray-700"
                        title="Copier le code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteConsole(currentPage.id, console.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-700"
                        title="Supprimer la console"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
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
                
                <div className="p-0">
                  <textarea
                    value={console.code}
                    onChange={(e) => updateConsole(currentPage.id, console.id, { code: e.target.value })}
                    placeholder="Entrez votre code ici..."
                    className={`w-full h-40 p-4 font-mono text-sm ${themeClasses.consoleBg} ${getSyntaxHighlightClass(console.language || 'javascript')} border-none resize-none focus:outline-none`}
                    style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
                  />
                </div>

                {console.showAfterText && (
                  <div className={`p-4 border-t ${themeClasses.border}`}>
                    <textarea
                      value={console.afterText || ''}
                      onChange={(e) => updateConsole(currentPage.id, console.id, { afterText: e.target.value })}
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
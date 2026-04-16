import localforage from 'localforage';

export interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

export type BibleVersion = 'ara' | 'acf' | 'nvi';

const BIBLE_URLS: Record<BibleVersion, string> = {
  ara: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_aa.json', // Almeida Atualizada
  acf: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_acf.json', // Almeida Corrigida Fiel
  nvi: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_nvi.json', // Nova Versão Internacional
};

export const VERSION_NAMES: Record<BibleVersion, string> = {
  ara: 'ARA (Almeida Revista e Atualizada)',
  acf: 'ACF (Almeida Corrigida Fiel)',
  nvi: 'NVI (Nova Versão Internacional)',
};

export async function getBible(version: BibleVersion): Promise<BibleBook[]> {
  const cacheKey = `bible_${version}`;
  
  try {
    // Try to get from cache
    const cached = await localforage.getItem<BibleBook[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch it
    const response = await fetch(BIBLE_URLS[version]);
    if (!response.ok) {
      throw new Error(`Failed to fetch Bible version ${version}`);
    }

    const data = await response.json();
    
    // Save to cache
    await localforage.setItem(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('Error loading Bible:', error);
    throw error;
  }
}

export interface SearchResult {
  bookName: string;
  bookAbbrev: string;
  chapter: number;
  verse: number;
  text: string;
}

export function searchBible(bible: BibleBook[], query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const book of bible) {
    for (let c = 0; c < book.chapters.length; c++) {
      const chapter = book.chapters[c];
      for (let v = 0; v < chapter.length; v++) {
        const verseText = chapter[v];
        if (verseText.toLowerCase().includes(lowerQuery)) {
          results.push({
            bookName: book.name,
            bookAbbrev: book.abbrev,
            chapter: c + 1,
            verse: v + 1,
            text: verseText,
          });
        }
      }
    }
  }

  return results;
}

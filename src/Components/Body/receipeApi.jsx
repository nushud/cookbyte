/**
 * Calls the local Ollama API to generate a recipe based on ingredients.
 * @param {string[]} ingredients - Array of ingredient strings
 * @returns {Promise<string>} - The generated recipe text
 */
export async function generateRecipe(ingredients) {
  const prompt = `I have these ingredients: ${ingredients.join(", ")}. Suggest a clear, step-by-step recipes which I can make.clearly indicate the receipe name and steps to follow `;

  let response;
  try {
    response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-r1:1.5b",
        prompt: prompt,
        stream: false,
      }),
    });
  } catch (err) {
    throw new Error("Failed to connect to the recipe service. Please make sure the server is running.");
  }

  if (!response.ok) {
    throw new Error(`Recipe service returned an error: ${response.status} ${response.statusText}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Received an invalid response from the recipe service.");
  }

  if (!data.response) {
    throw new Error("Recipe service returned an empty response.");
  }

  return data.response;
}

/**
 * Returns the TheMealDB ingredient image URL for a given ingredient name.
 * @param {string} ingredient
 * @returns {string}
 */
export function getIngredientImageUrl(ingredient) {
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ingredient)}-Small.png`;
}

/**
 * Searches TheMealDB for the best matching meal image.
 * First tries the recipe title, then falls back to ingredients.
 * @param {string} title
 * @param {string[]} ingredients
 * @returns {Promise<string|null>}
 */
export async function fetchRecipeImage(title, ingredients) {
  // Try searching by recipe title first
  if (title) {
    const titleKeywords = title.split(' ').slice(0, 3).join(' ')
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(titleKeywords)}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.meals && data.meals.length > 0) {
          return data.meals[0].strMealThumb
        }
      }
    } catch {
      // Fall through to ingredient search
    }
  }

  // Fallback: search by ingredients
  for (const ingredient of ingredients) {
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.meals && data.meals.length > 0) {
        return data.meals[0].strMealThumb
      }
    } catch {
      // Try next ingredient
    }
  }
  return null
}

/**
 * Fetches a relevant image for a step by searching TheMealDB with keywords.
 * Falls back to a random meal image if no match.
 * @param {string} stepText
 * @returns {Promise<string|null>}
 */
async function fetchStepImage(stepText) {
  const keywords = extractKeywords(stepText)
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(keywords)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.meals && data.meals.length > 0) {
      return data.meals[0].strMealThumb
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Fetches relevant images for each step. Falls back to a random meal image.
 * @param {{number:number,text:string}[]} steps
 * @returns {Promise<string[]>}
 */
export async function fetchStepImages(steps) {
  // Fetch a fallback image first (cache for all missing steps)
  let fallbackImage = null
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php')
    const data = await res.json()
    fallbackImage = data.meals?.[0]?.strMealThumb || null
  } catch {
    fallbackImage = null
  }

  const results = []
  for (const step of steps) {
    const img = await fetchStepImage(step.text)
    results.push(img || fallbackImage)
  }
  return results
}

/* ---------- Text Parsing Utilities ---------- */

export function parseSteps(text) {
  const cleaned = (text || '')
    .replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\u003e/g, '')
    .replace(/^\s*here\s+(is|are)\s+a?\s*recipe[\s:]*/i, '')
    .replace(/^\s*below\s+(is|are)\s+a?\s*recipe[\s:]*/i, '')
    .trim()

  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Look for numbered steps
  const steps = []
  let foundSteps = false
  for (const line of lines) {
    const match = line.match(/^(\d+)[.)\]]\s*(.+)$/)
    if (match) {
      steps.push({ number: parseInt(match[1]), text: stripMarkdown(match[2]) })
      foundSteps = true
    } else if (foundSteps && line.length > 10 && !isHeader(line)) {
      // Continuation lines after steps begin
      steps.push({ number: steps.length + 1, text: stripMarkdown(line) })
    }
  }

  // Fallback: split by sentences in instruction-looking content
  if (steps.length === 0) {
    const instructionLines = lines.filter(l => !isHeader(l) && l.length > 15)
    let currentStep = ''
    for (const line of instructionLines) {
      if (/^(ingredients?|instructions?|directions?|steps?|recipe|method|preparation|notes?|tips?|serving|garnish|variation):/i.test(line)) continue
      currentStep += ' ' + stripMarkdown(line)
      if (/[.!?]$/.test(line)) {
        steps.push({ number: steps.length + 1, text: currentStep.trim() })
        currentStep = ''
      }
    }
    if (currentStep.trim()) {
      steps.push({ number: steps.length + 1, text: currentStep.trim() })
    }
  }

  return steps
}

export function extractTitle(text) {
  const cleaned = (text || '')
    .replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\u003e/g, '')
    .trim()

  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  for (const line of lines.slice(0, 5)) {
    if (line.length < 60 && !isHeader(line) && !/^\d+[.)]/.test(line) && !/^[-•*]/.test(line)) {
      const stripped = stripMarkdown(line)
      if (stripped.length > 5) return stripped
    }
  }
  return 'A Delightful Creation'
}

function isHeader(line) {
  return /^(ingredients?|instructions?|directions?|steps?|recipe|method|preparation|notes?|tips?|serving|garnish|variation):/i.test(line)
}

export function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s*/, '')
    .trim()
}

function extractKeywords(text) {
  const clean = text
    .replace(/^\d+[.)]\s*/, '')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .trim()

  const words = clean.split(/\s+/).filter(w => w.length > 3)

  const stopWords = new Set([
    'water', 'salt', 'pepper', 'heat', 'cook', 'until', 'then', 'with',
    'into', 'from', 'over', 'each', 'they', 'them', 'your', 'this', 'that',
    'sauce', 'dish', 'food', 'meal', 'time', 'about', 'minutes', 'medium',
    'large', 'small', 'remove', 'place', 'using', 'while', 'once', 'after',
    'before', 'during', 'begin', 'start', 'finish', 'continue', 'repeat',
    'add', 'pour', 'turn', 'stir', 'mix', 'serve', 'take', 'make'
  ])

  const meaningful = words.filter(w => !stopWords.has(w))

  if (meaningful.length >= 2) {
    return meaningful.slice(0, 2).join(' ')
  }
  return meaningful[0] || words[0] || 'dish'
}

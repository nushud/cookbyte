import React from 'react'

export default function RecipeDisplay({ recipeText, recipeImage, ingredients }) {
  const [currentPage, setCurrentPage] = React.useState('cover')
  const steps = React.useMemo(() => parseSteps(recipeText), [recipeText])
  const title = React.useMemo(() => extractTitle(recipeText), [recipeText])

  function openBook() { setCurrentPage(0) }
  function nextPage() {
    setCurrentPage(prev => {
      if (prev === 2) return 'cover'
      return prev + 1
    })
  }

  if (currentPage === 'cover') {
    return (
      <div className="book-wrapper">
        <div className="book-cover" onClick={openBook} role="button" tabIndex={0} aria-label="Open recipe book">
          <div className="cover-ornament top-left">❧</div>
          <div className="cover-ornament top-right">❧</div>
          <div className="cover-ornament bottom-left">❧</div>
          <div className="cover-ornament bottom-right">❧</div>
          <div className="cover-border">
            <div className="cover-content">
              <div className="book-brand">
                <h1 className="book-brand-title">CookByte</h1>
                <p className="book-brand-caption">Culinary Code</p>
              </div>
              <div className="cover-line"></div>
              <p className="cover-subtitle">A Treasury of Flavour</p>
              {recipeImage && (
                <div className="cover-recipe-image">
                  <img src={recipeImage} alt="Featured dish" />
                </div>
              )}
              <div className="cover-line"></div>
              <p className="cover-hint">Click to Open</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isLast = currentPage === 2
  const pageLabel = currentPage === 0 ? 'I' : currentPage === 1 ? 'II' : 'III'

  return (
    <div className="book-wrapper">
      <div className="book-interior" onClick={nextPage} role="button" tabIndex={0} aria-label={isLast ? 'Return to cover' : 'Next page'}>
        <div className="book-page">
          <div className="page-binding"></div>
          <div className="page-ornament top-left">☙</div>
          <div className="page-ornament top-right">❧</div>
          <div className="page-ornament bottom-left">❧</div>
          <div className="page-ornament bottom-right">☙</div>
          <div className="page-number top">{pageLabel}</div>
          <div className="page-content">
            {currentPage === 0 && <PageTitle title={title} ingredients={ingredients} />}
            {currentPage === 1 && <PageSteps steps={steps} />}
            {currentPage === 2 && <PageFinal title={title} recipeImage={recipeImage} />}
          </div>
          <div className="page-number bottom">{pageLabel}</div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Page 1: Recipe Title ---------- */
function PageTitle({ title, ingredients }) {
  return (
    <>
      <div className="recipe-title-section">
        <h2 className="page-main-title">{title || 'A Delightful Creation'}</h2>
        <div className="title-underline"></div>
      </div>
      {ingredients && ingredients.length > 0 && (
        <div className="ingredients-section">
          <h4 className="ingredients-subtitle">Ingredients</h4>
          <div className="ingredients-list-compact">
            {ingredients.map((item, i) => (
              <span key={i} className="ingredient-tag">{item}</span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ---------- Page 2: Steps to Follow ---------- */
function PageSteps({ steps }) {
  if (!steps || steps.length === 0) {
    return (
      <>
        <h3 className="section-heading">Steps to Follow</h3>
        <div className="steps-box">
          <p className="boxed-paragraph" style={{textAlign:'center', textIndent:0}}>No instructions found in the response.</p>
        </div>
      </>
    )
  }
  return (
    <>
      <h3 className="section-heading">Steps to Follow</h3>
      <div className="steps-box">
        {steps.map((step, i) => (
          <div key={i} className="step-bullet-item">
            <span className="step-bullet">•</span>
            <span className="step-bullet-text">{step.text}</span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- Page 3: Final Result ---------- */
function PageFinal({ title, recipeImage }) {
  return (
    <>
      <h3 className="section-heading">The Result</h3>
      <div className="final-result-box">
        {recipeImage && (
          <div className="final-result-image">
            <img src={recipeImage} alt="Final dish" />
          </div>
        )}
        <h4 className="final-result-title">{title || 'A Delightful Creation'}</h4>
        <p className="final-result-text">Serve warm and savour every bite. Bon appétit!</p>
        <div className="end-line"></div>
        <div className="end-ornament">❦</div>
        <p className="end-hint">Click to return to cover</p>
      </div>
    </>
  )
}

/* ---------- Helpers ---------- */
function parseSteps(text) {
  const cleaned = (text || '')
    .replace(/\u003cthink\u003e[\s\S]*?\u003c\/think>/g, '')
    .replace(/^\s*here\s+(is|are)\s+a?\s*recipe[\s:]*/i, '')
    .replace(/^\s*below\s+(is|are)\s+a?\s*recipe[\s:]*/i, '')
    .trim()

  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  const steps = []
  let foundSteps = false
  for (const line of lines) {
    const match = line.match(/^(\d+)[.)\]]\s*(.+)$/)
    if (match) {
      steps.push({ number: parseInt(match[1]), text: stripMarkdown(match[2]) })
      foundSteps = true
    } else if (foundSteps && line.length > 10 && !isHeader(line)) {
      steps.push({ number: steps.length + 1, text: stripMarkdown(line) })
    }
  }

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

function extractTitle(text) {
  const cleaned = (text || '')
    .replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\003e/g, '')
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

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s*/, '')
    .trim()
}

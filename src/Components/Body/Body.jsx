import './Body.css'
import React from 'react'
import RecipeDisplay from './receipeCode'
import {
  generateRecipe,
  fetchRecipeImage,
  getIngredientImageUrl,
  parseSteps,
  fetchStepImages
} from './receipeApi'

export default function Body() {
  const [ingredient, setIngredient] = React.useState([])
  const [recipeShown, setRecipeShown] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [recipeText, setRecipeText] = React.useState("")
  const [error, setError] = React.useState("")
  const [recipeImage, setRecipeImage] = React.useState(null)
  const [stepImages, setStepImages] = React.useState([])
  const [inputValue, setInputValue] = React.useState("")
  const [ingredientError, setIngredientError] = React.useState("")

  function checkImageExists(url) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const name = inputValue.trim()
    if (!name) return

    setIngredientError("")
    const imgUrl = getIngredientImageUrl(name)
    const exists = await checkImageExists(imgUrl)

    if (!exists) {
      setIngredientError("The ingredient entered does not exist")
      return
    }

    setIngredient(prev => [...prev, name])
    setInputValue("")
  }

  async function handleGetRecipe() {
    if (ingredient.length <= 3) return

    setIsLoading(true)
    setError("")
    setRecipeText("")
    setRecipeImage(null)
    setStepImages([])
    setRecipeShown(false)

    try {
      const text = await generateRecipe(ingredient)
      const img = await fetchRecipeImage(ingredient)
      const steps = parseSteps(text)
      const stepImgs = await fetchStepImages(steps)
      setRecipeText(text)
      setRecipeImage(img)
      setStepImages(stepImgs)
      setRecipeShown(true)
    } catch (err) {
      setError(err.message || "Failed to generate recipe. Please try again.")
      setRecipeShown(false)
    } finally {
      setIsLoading(false)
    }
  }

  function ShownIngredient() {
    return (
      <>
        <h1> List of ingredients </h1>
        <ul className='ingredientlist'>
          {ingredient.map((item, index) => (
            <li key={index}>
              <img
                src={getIngredientImageUrl(item)}
                alt={item}
                className="ingredient-image"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {item}
            </li>
          ))}
        </ul>
        {ingredient.length > 3 && (
          <section className="get-recipe-container">
            <div>
              <h3>Ready for a recipe?</h3>
              <p>Generate a recipe from your list of ingredients.</p>
            </div>
            <button onClick={handleGetRecipe}>Get a recipe</button>
          </section>
        )}
      </>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className='Body'>
          <input
            className='IngredientText'
            type="text"
            placeholder="e.g Oregano"
            aria-label='Add ingredients'
            name='ingredient'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
          />
          <button>Add Ingredients</button>
        </div>
      </form>
      {ingredientError && (
        <div className="ingredient-error">{ingredientError}</div>
      )}
      <section> {ingredient.length > 0 ? <ShownIngredient /> : null}
      </section>

      {isLoading && (
        <div className="loading-message">
          <div className="cooking-animation">
            <div className="steam">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="cooking-pot"></div>
          </div>
          <span>Chef Claude is getting your recipe ready...</span>
        </div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {recipeShown && recipeText && (
        <RecipeDisplay
          recipeText={recipeText}
          recipeImage={recipeImage}
          ingredients={ingredient}
          stepImages={stepImages}
        />
      )}
    </>
  )
}

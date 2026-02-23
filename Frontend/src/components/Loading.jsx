import { useEffect, useState } from 'react'
import './Loading.css'

function Loading({ onLoaded }) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [loadingText, setLoadingText] = useState('Preparing your journey...')

  const steps = [
    "Exploring the ancient Sigiriya Rock...",
    "Brewing fresh Ceylon Tea...",
    "Catching the train to Ella...",
    "Watching the sunset at Galle Fort...",
    "Spotting leopards in Yala...",
    "Finding the best coastal waves..."
  ]

  useEffect(() => {
    // Progress bar simulation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setFadeOut(true)
            if (onLoaded) {
              setTimeout(() => onLoaded(), 600)
            }
          }, 500)
          return 100
        }
        // Non-linear progress simulation
        const increment = Math.random() * 1.5
        return Math.min(prev + increment, 100)
      })
    }, 30)

    // Text rotation
    const textInterval = setInterval(() => {
        setLoadingText(steps[Math.floor(Math.random() * steps.length)])
    }, 2000)

    return () => {
      clearInterval(interval)
      clearInterval(textInterval)
    }
  }, [onLoaded])

  return (
    <div className={`loading-container ${fadeOut ? 'fade-out' : ''}`}>
      {/* Background Atmosphere */}
      <div className="travel-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="loading-content">
        <div className="brand-loader">
          <div className="spinner-ring"></div>
          <div className="spinner-icon">
             {/* Simple Elephant Icon - Themed */}
            <svg viewBox="0 0 100 100" className="elephant-svg">
               <path d="M70,60 C75,60 85,55 85,45 C85,35 75,30 65,32 C60,20 40,20 35,32 C25,30 15,35 15,45 C15,55 25,60 30,60" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
               <path d="M30,55 Q50,45 70,55" fill="none" stroke="var(--secondary)" strokeWidth="3" strokeLinecap="round"/>
               <circle cx="50" cy="40" r="12" fill="var(--primary-light)" opacity="0.2"/>
               <circle cx="50" cy="40" r="4" fill="var(--primary)"/>
            </svg>
          </div>
        </div>

        <h1 className="app-title">Travel<span>Genie</span></h1>
        <p className="loading-message">{loadingText}</p>

        <div className="progress-wrapper">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-info">
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Loading

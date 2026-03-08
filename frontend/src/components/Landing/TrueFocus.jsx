import { useEffect, useRef, useState } from 'react';
import './TrueFocus.css';

const TrueFocus = ({
  sentence = 'True Focus',
  separator = ' ',
  focusIndices,
  manualMode = false,
  blurAmount = 5,
  borderColor = '#5227FF',
  glowColor = 'rgba(82, 39, 255, 0.55)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 1,
  className = ''
}) => {
  const words = sentence.split(separator).filter(Boolean);
  const resolvedFocusIndices =
    Array.isArray(focusIndices) && focusIndices.length > 0
      ? focusIndices.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < words.length)
      : words.map((_, idx) => idx);
  const [currentIndex, setCurrentIndex] = useState(resolvedFocusIndices[0] ?? -1);
  const [lastActiveIndex, setLastActiveIndex] = useState(resolvedFocusIndices[0] ?? -1);
  const containerRef = useRef(null);
  const wordRefs = useRef([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (manualMode || resolvedFocusIndices.length <= 1) return undefined;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const currentPos = resolvedFocusIndices.indexOf(prev);
        const safePos = currentPos >= 0 ? currentPos : 0;
        return resolvedFocusIndices[(safePos + 1) % resolvedFocusIndices.length];
      });
    }, (animationDuration + pauseBetweenAnimations) * 1000);

    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, resolvedFocusIndices]);

  useEffect(() => {
    if (resolvedFocusIndices.length === 0) {
      setCurrentIndex(-1);
      setLastActiveIndex(-1);
      return;
    }
    if (!resolvedFocusIndices.includes(currentIndex)) {
      setCurrentIndex(resolvedFocusIndices[0]);
      setLastActiveIndex(resolvedFocusIndices[0]);
    }
  }, [resolvedFocusIndices, currentIndex]);

  useEffect(() => {
    const syncFocusRect = () => {
      if (currentIndex < 0) return;
      if (!containerRef.current || !wordRefs.current[currentIndex]) return;

      const parentRect = containerRef.current.getBoundingClientRect();
      const activeRect = wordRefs.current[currentIndex].getBoundingClientRect();

      setFocusRect({
        x: activeRect.left - parentRect.left,
        y: activeRect.top - parentRect.top,
        width: activeRect.width,
        height: activeRect.height
      });
    };

    syncFocusRect();
    window.addEventListener('resize', syncFocusRect);
    return () => window.removeEventListener('resize', syncFocusRect);
  }, [currentIndex, words.length]);

  const handleMouseEnter = (index) => {
    if (!manualMode) return;
    if (!resolvedFocusIndices.includes(index)) return;
    setLastActiveIndex(index);
    setCurrentIndex(index);
  };

  const handleMouseLeave = () => {
    if (!manualMode) return;
    setCurrentIndex(lastActiveIndex);
  };

  return (
    <div className={`focus-container ${className}`.trim()} ref={containerRef}>
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        const isFocusable = resolvedFocusIndices.includes(index);
        return (
          <span
            key={`${word}-${index}`}
            ref={(el) => {
              wordRefs.current[index] = el;
            }}
            className={`focus-word ${isActive ? 'active' : ''}`}
            style={{
              filter: isFocusable && !isActive ? `blur(${blurAmount}px)` : 'blur(0px)',
              transition: `filter ${animationDuration}s ease`,
              '--border-color': borderColor,
              '--glow-color': glowColor
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </span>
        );
      })}

      <div
        className="focus-frame"
        style={{
          transform: `translate(${focusRect.x}px, ${focusRect.y}px)`,
          width: `${focusRect.width}px`,
          height: `${focusRect.height}px`,
          opacity: currentIndex >= 0 && resolvedFocusIndices.length > 0 ? 1 : 0,
          transition: `transform ${animationDuration}s ease, width ${animationDuration}s ease, height ${animationDuration}s ease, opacity ${animationDuration}s ease`,
          '--border-color': borderColor,
          '--glow-color': glowColor
        }}
      >
        <span className="corner top-left"></span>
        <span className="corner top-right"></span>
        <span className="corner bottom-left"></span>
        <span className="corner bottom-right"></span>
      </div>
    </div>
  );
};

export default TrueFocus;

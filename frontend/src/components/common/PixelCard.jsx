/**
 * PixelCard - Интерактивный компонент с анимированными пикселями
 * 
 * Создает красивую анимацию пикселей, которые появляются волнами от центра к краям
 * и исчезают в обратном порядке. Идеально подходит для скрытия контента или 
 * создания интерактивных эффектов.
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 
 * 1. Простое использование с hover эффектом:
 * <PixelCard variant="blue">
 *   <div>Ваш контент здесь</div>
 * </PixelCard>
 * 
 * 2. Скрытие контента (клик для показа/скрытия):
 * <PixelCard variant="black">
 *   <div className="pixel-card-content">
 *     Секретный текст
 *   </div>
 * </PixelCard>
 * 
 * 3. Кастомные настройки:
 * <PixelCard variant="red" gap={5} speed={80} colors="#ff0000,#ff4444,#ff8888">
 *   <div>Кастомный контент</div>
 * </PixelCard>
 * 
 * ВАРИАНТЫ (variant):
 * - "default" - серые пиксели, hover эффект
 * - "blue" - голубые пиксели, hover эффект  
 * - "yellow" - желтые пиксели, hover эффект
 * - "pink" - розовые пиксели, быстрая анимация
 * - "red" - красные пиксели, hover эффект
 * - "black" - черные пиксели, клик для показа/скрытия контента
 * 
 * ПАРАМЕТРЫ:
 * - variant: вариант цветовой схемы
 * - gap: расстояние между пикселями
 * - speed: скорость анимации (0-100)
 * - colors: кастомные цвета через запятую
 * - noFocus: отключить фокус (для black варианта)
 * - className: дополнительные CSS классы
 * - children: содержимое компонента
 */

import { useEffect, useRef, useState } from "react";
import './PixelCard.css';

/**
 * Класс Pixel - отдельный анимированный пиксель
 * Каждый пиксель имеет свою позицию, цвет, размер и задержку анимации
 */
class Pixel {
  constructor(canvas, context, x, y, color, speed, delay, maxDelay) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay; // Задержка для появления (от центра к краям)
    this.reverseDelay = maxDelay - delay; // Обратная задержка для исчезновения (от краев к центру)
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Отрисовка пикселя на canvas
   */
  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(
      this.x + centerOffset,
      this.y + centerOffset,
      this.size,
      this.size
    );
  }

  /**
   * Анимация появления пикселя (от центра к краям)
   * Сначала ждет свою очередь (delay), затем увеличивается в размере
   */
  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  /**
   * Анимация исчезновения пикселя (от краев к центру)
   * Использует reverseDelay для создания волнового эффекта в обратном направлении
   */
  disappear() {
    this.isShimmer = false;
    if (this.counter <= this.reverseDelay) {
      this.counter += this.counterStep;
      this.draw(); // Продолжаем показывать пиксель пока не настала его очередь
      return;
    }
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    } else {
      this.size -= 0.1;
    }
    this.draw();
  }

  /**
   * Сброс для исчезновения - начинаем с полного размера
   */
  reset() {
    this.size = this.maxSize;
    this.isIdle = false;
    this.isShimmer = false;
    this.counter = 0;
  }

  /**
   * Сброс для появления - начинаем с нулевого размера
   */
  resetForAppear() {
    this.size = 0;
    this.isIdle = false;
    this.isShimmer = false;
    this.counter = 0;
  }

  /**
   * Эффект мерцания пикселя
   */
  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

/**
 * Преобразует значение скорости в эффективную скорость анимации
 */
function getEffectiveSpeed(value, reducedMotion) {
  const min = 0;
  const max = 100;
  const throttle = 0.001;
  const parsed = parseInt(value, 10);

  if (parsed <= min || reducedMotion) {
    return min;
  } else if (parsed >= max) {
    return max * throttle;
  } else {
    return parsed * throttle;
  }
}

/**
 * Предустановленные варианты цветовых схем и настроек
 */
const VARIANTS = {
  default: {
    activeColor: null,
    gap: 5,
    speed: 35,
    colors: "#f8fafc,#f1f5f9,#cbd5e1",
    noFocus: false
  },
  blue: {
    activeColor: "#e0f2fe",
    gap: 10,
    speed: 25,
    colors: "#e0f2fe,#7dd3fc,#0ea5e9",
    noFocus: false
  },
  yellow: {
    activeColor: "#fef08a",
    gap: 3,
    speed: 20,
    colors: "#fef08a,#fde047,#eab308",
    noFocus: false
  },
  pink: {
    activeColor: "#fecdd3",
    gap: 6,
    speed: 80,
    colors: "#fecdd3,#fda4af,#e11d48",
    noFocus: true
  },
  red: {
    activeColor: "#fecaca",
    gap: 4,
    speed: 60,
    colors: "#fecaca,#f87171,#dc2626",
    noFocus: false
  },
  black: {
    activeColor: "#000000",
    gap: 3,
    speed: 40,
    colors: "#000000,#1f1f1f,#374151",
    noFocus: true
  }
};

/**
 * Основной компонент PixelCard
 */
export default function PixelCard({
  variant = "default",
  gap,
  speed,
  colors,
  noFocus,
  className = "",
  children
}) {
  // Refs для работы с DOM и canvas
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const pixelsRef = useRef([]);
  const animationRef = useRef(null);
  const timePreviousRef = useRef(performance.now());
  
  // Состояние для black варианта (показаны/скрыты пиксели)
  const [pixelsVisible, setPixelsVisible] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Проверка на reduced motion
  const reducedMotion = useRef(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;

  // Получаем финальные настройки из варианта или пропсов
  const variantCfg = VARIANTS[variant] || VARIANTS.default;
  const finalGap = gap ?? variantCfg.gap;
  const finalSpeed = speed ?? variantCfg.speed;
  const finalColors = colors ?? variantCfg.colors;
  const finalNoFocus = noFocus ?? variantCfg.noFocus;

  /**
   * Инициализация пикселей на canvas
   * Создает сетку пикселей с разными задержками для волнового эффекта
   */
  const initPixels = () => {
    if (!containerRef.current || !canvasRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    const ctx = canvasRef.current.getContext("2d");

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;

    const colorsArray = finalColors.split(",");
    const pxs = [];
    let maxDelay = 0;
    
    // Сначала найдем максимальную задержку для расчета обратного порядка
    for (let x = 0; x < width; x += parseInt(finalGap, 10)) {
      for (let y = 0; y < height; y += parseInt(finalGap, 10)) {
        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = reducedMotion ? 0 : distance;
        if (delay > maxDelay) maxDelay = delay;
      }
    }
    
    // Создаем пиксели с учетом максимальной задержки
    for (let x = 0; x < width; x += parseInt(finalGap, 10)) {
      for (let y = 0; y < height; y += parseInt(finalGap, 10)) {
        const color =
          colorsArray[Math.floor(Math.random() * colorsArray.length)];

        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = reducedMotion ? 0 : distance;

        pxs.push(
          new Pixel(
            canvasRef.current,
            ctx,
            x,
            y,
            color,
            getEffectiveSpeed(finalSpeed, reducedMotion),
            delay,
            maxDelay
          )
        );
      }
    }
    pixelsRef.current = pxs;
  };

  /**
   * Главный цикл анимации
   * Запускает указанный метод для всех пикселей
   */
  const doAnimate = (fnName) => {
    animationRef.current = requestAnimationFrame(() => doAnimate(fnName));
    const timeNow = performance.now();
    const timePassed = timeNow - timePreviousRef.current;
    const timeInterval = 1000 / 60; // 60 FPS

    if (timePassed < timeInterval) return;
    timePreviousRef.current = timeNow - (timePassed % timeInterval);

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    let allIdle = true;
    for (let i = 0; i < pixelsRef.current.length; i++) {
      const pixel = pixelsRef.current[i];
      pixel[fnName]();
      if (!pixel.isIdle) {
        allIdle = false;
      }
    }
    
    // Останавливаем анимацию когда все пиксели завершили работу
    if (allIdle) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  /**
   * Запуск анимации
   */
  const handleAnimation = (name) => {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(() => doAnimate(name));
  };

  /**
   * Обработчик клика для black варианта
   * Переключает видимость пикселей (показать/скрыть контент)
   */
  const handleClick = () => {
    if (variant === "black") {
      if (pixelsVisible) {
        // Скрываем контент - начинаем с полного размера пикселей
        pixelsRef.current.forEach(pixel => pixel.reset());
        handleAnimation("disappear");
        setPixelsVisible(false);
      } else {
        // Показываем контент - начинаем с нулевого размера пикселей
        pixelsRef.current.forEach(pixel => pixel.resetForAppear());
        handleAnimation("appear");
        setPixelsVisible(true);
      }
    }
  };

  // Обработчики событий для hover эффектов (кроме black варианта)
  const onMouseEnter = () => {
    if (variant !== "black") {
      handleAnimation("appear");
    }
  };
  
  const onMouseLeave = () => {
    if (variant !== "black") {
      handleAnimation("disappear");
    }
  };
  
  const onFocus = (e) => {
    if (variant !== "black" && !e.currentTarget.contains(e.relatedTarget)) {
      handleAnimation("appear");
    }
  };
  
  const onBlur = (e) => {
    if (variant !== "black" && !e.currentTarget.contains(e.relatedTarget)) {
      handleAnimation("disappear");
    }
  };

  // Инициализация и ресайз
  useEffect(() => {
    initPixels();
    const observer = new ResizeObserver(() => {
      initPixels();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalGap, finalSpeed, finalColors, finalNoFocus]);

  // Автоматическое появление пикселей для black варианта при загрузке
  useEffect(() => {
    if (variant === "black" && !isInitialized) {
      setTimeout(() => {
        handleAnimation("appear");
        setIsInitialized(true);
      }, 100);
    }
  }, [variant, isInitialized]);

  return (
    <div
      ref={containerRef}
      className={`pixel-card ${className} ${variant === "black" ? "pixel-card-black" : ""} ${variant === "black" && !pixelsVisible ? "pixels-hidden" : ""}`}
      onClick={variant === "black" ? handleClick : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={finalNoFocus ? undefined : onFocus}
      onBlur={finalNoFocus ? undefined : onBlur}
      tabIndex={finalNoFocus ? -1 : 0}
    >
      <canvas
        className="pixel-canvas"
        ref={canvasRef}
      />
      {children}
    </div>
  );
} 
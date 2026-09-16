---
name: framer-motion-patterns
description: Patrones de animación, transiciones de pantalla, modales y microinteracciones con Framer Motion en React.
---

# Patrones de Animación con Framer Motion

Esta skill define patrones de animación y buenas prácticas para interfaces en React utilizando Framer Motion (`motion/react` o `framer-motion`).

---

## 1. Variantes de Transición de Pantalla (Page Fade & Slide)

```tsx
import { motion, AnimatePresence } from 'framer-motion';

export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    transition: { duration: 0.15 } 
  },
};
```

---

## 2. Animación de Entrada Escalonada en Listas (Staggered Children)

```tsx
export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
```

---

## 3. Modales con Backdrop Blur y Spring Physics

```tsx
export const modalBackdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const modalContent = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: 'spring', damping: 25, stiffness: 300 } 
  },
};
```

---

## 4. Tarjetas con Hover Interactivo

```tsx
<motion.div
  whileHover={{ y: -3, boxShadow: '0 8px 24px -4px rgba(11, 31, 63, 0.12)' }}
  whileTap={{ scale: 0.99 }}
  transition={{ duration: 0.15 }}
  className="gov-card"
>
  {/* Contenido de la tarjeta */}
</motion.div>
```

---

## 5. Reglas de Rendimiento y Accesibilidad

* Respetar siempre `prefers-reduced-motion` utilizando `useReducedMotion()`.
* Utilizar `layoutId` para transiciones de tabs compartidos.
* Evitar animar propiedades costosas como `width`, `height` o `top`; preferir `transform` (`x`, `y`, `scale`) y `opacity`.

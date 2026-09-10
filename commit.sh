#!/usr/bin/env bash

# ==============================================================================
# Script de Commit Rápido e Interactivo para Weightcontrol
# ==============================================================================

# Colores para la terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # Sin color

echo -e "${CYAN}==============================================${NC}"
echo -e "${GREEN}   🚀 Asistente de Commits - Weightcontrol   ${NC}"
echo -e "${CYAN}==============================================${NC}"

# Verificar si es un repositorio git
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Este directorio no es un repositorio de Git.${NC}"
  exit 1
fi

# Mostrar estado actual
echo -e "\n${YELLOW}📋 Estado actual de los archivos modificados:${NC}"
git status -s

# Verificar si hay cambios
if [ -z "$(git status --porcelain)" ]; then
  echo -e "\n${GREEN}✨ No hay cambios pendientes por commitear. ¡Todo limpio!${NC}"
  exit 0
fi

# Preguntar si desea agregar todos los cambios
echo ""
read -p " ¿Deseas agregar todos los archivos (git add .) ? [S/n]: " ADD_ALL
ADD_ALL=${ADD_ALL:-S}

if [[ "$ADD_ALL" =~ ^[Ss]$ ]]; then
  git add .
  echo -e "${GREEN}✔ Archivos agregados al área de preparación (stage).${NC}"
else
  echo -e "${YELLOW}ℹ Agrega manualmente los archivos con 'git add <archivo>' y vuelve a ejecutar el script.${NC}"
  exit 0
fi

# Si se pasó un mensaje como argumento al script
if [ -n "$1" ]; then
  COMMIT_MSG="$1"
else
  # Modo interactivo - Selección de tipo de commit (Conventional Commits)
  echo -e "\n${PURPLE}📌 Selecciona el tipo de cambio:${NC}"
  echo -e "  1) ${GREEN}feat${NC}     - Nueva característica o funcionalidad"
  echo -e "  2) ${RED}fix${NC}      - Corrección de un bug o error"
  echo -e "  3) ${CYAN}docs${NC}     - Cambios solo en la documentación (README, etc.)"
  echo -e "  4) ${YELLOW}style${NC}    - Estilos, formateo, punto y coma (sin cambios en lógica)"
  echo -e "  5) ${PURPLE}refactor${NC} - Refactorización de código sin añadir funcionalidad ni arreglar bugs"
  echo -e "  6) ${CYAN}test${NC}     - Añadir o corregir pruebas unitarias o e2e"
  echo -e "  7) ${YELLOW}chore${NC}    - Tareas de mantenimiento, configs, dependencias"
  echo -e "  8) ✍ Personalizado (escribir mensaje directo)"

  read -p " Elige una opción [1-8]: " OPTION

  case $OPTION in
    1) TYPE="feat" ;;
    2) TYPE="fix" ;;
    3) TYPE="docs" ;;
    4) TYPE="style" ;;
    5) TYPE="refactor" ;;
    6) TYPE="test" ;;
    7) TYPE="chore" ;;
    8) TYPE="" ;;
    *) echo -e "${RED}Opción inválida. Se usará mensaje personalizado.${NC}"; TYPE="" ;;
  esac

  if [ -n "$TYPE" ]; then
    # Solicitar alcance opcional (ej: backend, frontend, auth, ui)
    echo ""
    read -p " Alcance / Módulo opcional (ej. backend, frontend, auth) [Enter para omitir]: " SCOPE
    
    # Solicitar descripción
    read -p " Descripción del commit (breve y clara): " DESC

    while [ -z "$DESC" ]; do
      echo -e "${RED}⚠ La descripción no puede estar vacía.${NC}"
      read -p " Descripción del commit: " DESC
    done

    if [ -n "$SCOPE" ]; then
      COMMIT_MSG="${TYPE}(${SCOPE}): ${DESC}"
    else
      COMMIT_MSG="${TYPE}: ${DESC}"
    fi
  else
    read -p " Escribe el mensaje completo del commit: " COMMIT_MSG
    while [ -z "$COMMIT_MSG" ]; do
      echo -e "${RED}⚠ El mensaje no puede estar vacío.${NC}"
      read -p " Escribe el mensaje completo del commit: " COMMIT_MSG
    done
  fi
fi

# Confirmar y realizar commit
echo -e "\n${CYAN}💬 Mensaje del commit:${NC} ${GREEN}\"$COMMIT_MSG\"${NC}"
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✔ ¡Commit realizado con éxito! 🎉${NC}"
else
  echo -e "\n${RED}❌ Ocurrió un error al realizar el commit.${NC}"
  exit 1
fi

# Preguntar si desea hacer push
echo ""
read -p " ¿Deseas hacer push a tu repositorio remoto? [s/N]: " DO_PUSH
DO_PUSH=${DO_PUSH:-N}

if [[ "$DO_PUSH" =~ ^[Ss]$ ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo -e "\n${YELLOW}Subiendo cambios a la rama '$BRANCH'...${NC}"
  git push origin "$BRANCH" 2>/dev/null || git push -u origin "$BRANCH"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ ¡Push completado con éxito! 🚀${NC}"
  else
    echo -e "${RED}⚠ No se pudo hacer push. Verifica que tengas un repositorio remoto configurado (git remote -v).${NC}"
  fi
fi

echo -e "\n${CYAN}==============================================${NC}"

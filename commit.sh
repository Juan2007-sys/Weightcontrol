#!/usr/bin/env bash

# ==============================================================================
# Script de Commit Rapido e Interactivo para Weightcontrol
# ==============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m'

echo -e "${CYAN}==============================================${NC}"
echo -e "${GREEN}   🚀 Asistente de Commits - Weightcontrol   ${NC}"
echo -e "${CYAN}==============================================${NC}"

# 1. Verificar si es un repositorio Git
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Este directorio no es un repositorio de Git.${NC}"
  exit 1
fi

# 2. Informacion de autor y rama
AUTHOR_NAME=$(git config user.name)
AUTHOR_EMAIL=$(git config user.email)
BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)
BRANCH=${BRANCH:-main}

if [ -n "$AUTHOR_NAME" ]; then
  echo -e "${GRAY}👤 Autor: $AUTHOR_NAME <$AUTHOR_EMAIL>${NC}"
fi
echo -e "${CYAN}🌿 Rama:  $BRANCH${NC}"

# 3. Mostrar estado actual
echo -e "\n${YELLOW}📋 Estado actual de los archivos modificados:${NC}"
git status -s

# Verificar si hay cambios
if [ -z "$(git status --porcelain)" ]; then
  echo -e "\n${GREEN}✨ No hay cambios pendientes por commitear. ¡Todo limpio!${NC}"
  echo -e "${CYAN}==============================================${NC}\n"
  exit 0
fi

# 4. Preguntar si desea agregar todos los cambios
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

# 5. Construir mensaje de commit
if [ -n "$1" ]; then
  COMMIT_MSG="$1"
else
  echo -e "\n${PURPLE}📌 Selecciona el tipo de cambio:${NC}"
  echo -e "  1) ${GREEN}feat${NC}     - Nueva característica o funcionalidad"
  echo -e "  2) ${RED}fix${NC}      - Corrección de un bug o error"
  echo -e "  3) ${CYAN}docs${NC}     - Cambios solo en la documentación (README, etc.)"
  echo -e "  4) ${YELLOW}style${NC}    - Estilos, formateo, punto y coma"
  echo -e "  5) ${PURPLE}refactor${NC} - Refactorización de código"
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
    echo ""
    read -p " Alcance / Módulo opcional (ej. backend, frontend, auth) [Enter para omitir]: " SCOPE
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
    echo ""
    read -p " Escribe el mensaje completo del commit: " COMMIT_MSG
    while [ -z "$COMMIT_MSG" ]; do
      echo -e "${RED}⚠ El mensaje no puede estar vacío.${NC}"
      read -p " Escribe el mensaje completo del commit: " COMMIT_MSG
    done
  fi
fi

# 6. Realizar commit
echo -e "\n${CYAN}💬 Mensaje del commit:${NC} ${GREEN}\"$COMMIT_MSG\"${NC}"
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✔ ¡Commit realizado con éxito! 🎉${NC}"
else
  echo -e "\n${RED}❌ Ocurrió un error al realizar el commit.${NC}"
  exit 1
fi

# 7. Preguntar si desea hacer push
echo ""
read -p " ¿Deseas hacer push a GitHub ($BRANCH)? [S/n]: " DO_PUSH
DO_PUSH=${DO_PUSH:-S}

if [[ "$DO_PUSH" =~ ^[Ss]$ ]]; then
  echo -e "\n${YELLOW}Subiendo cambios a origin/$BRANCH...${NC}"
  git push -u origin "$BRANCH"
  if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✔ ¡Push completado con éxito a GitHub! 🚀${NC}"
  else
    echo -e "\n${RED}⚠ No se pudo hacer push.${NC}"
  fi
fi

echo -e "\n${CYAN}==============================================${NC}"
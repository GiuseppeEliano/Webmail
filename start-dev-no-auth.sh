#!/bin/bash
# Script para iniciar o modo de desenvolvimento sem autenticação

echo "🔓 Iniciando modo de desenvolvimento SEM autenticação..."
export SKIP_AUTH=true
NODE_ENV=development SKIP_AUTH=true tsx server/index.ts
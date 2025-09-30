import { Super8Pairing, Super8Stats } from './types'

// Algoritmo para gerar combinações de duplas no SUPER 8
export const generateSuper8Pairings = (players: string[]): Super8Pairing[][] => {
  const n = players.length
  
  if (n < 5 || n > 12) {
    throw new Error('SUPER 8 requer entre 5 e 12 jogadores')
  }

  const rounds: Super8Pairing[][] = []
  const usedPairings = new Set<string>()
  const playerPartners = new Map<string, Set<string>>()
  
  // Inicializar mapa de parceiros
  players.forEach(player => {
    playerPartners.set(player, new Set())
  })

  // Função para criar chave única de dupla
  const createPairKey = (p1: string, p2: string) => {
    return [p1, p2].sort().join('-')
  }

  // Função para verificar se dois jogadores já foram parceiros
  const haveBeenPartners = (p1: string, p2: string) => {
    return playerPartners.get(p1)?.has(p2) || false
  }

  // Função para marcar dois jogadores como parceiros
  const markAsPartners = (p1: string, p2: string) => {
    playerPartners.get(p1)?.add(p2)
    playerPartners.get(p2)?.add(p1)
  }

  // Calcular número aproximado de rodadas necessárias
  const totalPossiblePairs = (n * (n - 1)) / 2
  const pairsPerRound = Math.floor(n / 2)
  const estimatedRounds = Math.ceil(totalPossiblePairs / pairsPerRound) * 2 // Multiplicar por 2 para garantir que todos joguem juntos

  for (let round = 0; round < estimatedRounds; round++) {
    const roundPairings: Super8Pairing[] = []
    const usedInRound = new Set<string>()
    const availablePlayers = [...players]

    // Embaralhar jogadores para variedade
    for (let i = availablePlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[availablePlayers[i], availablePlayers[j]] = [availablePlayers[j], availablePlayers[i]]
    }

    // Tentar formar duplas priorizando jogadores que ainda não foram parceiros
    while (availablePlayers.length >= 4) {
      let bestPairing: Super8Pairing | null = null
      let bestScore = -1

      // Tentar todas as combinações possíveis para esta rodada
      for (let i = 0; i < availablePlayers.length - 3; i++) {
        for (let j = i + 1; j < availablePlayers.length - 2; j++) {
          for (let k = j + 1; k < availablePlayers.length - 1; k++) {
            for (let l = k + 1; l < availablePlayers.length; l++) {
              const p1 = availablePlayers[i]
              const p2 = availablePlayers[j]
              const p3 = availablePlayers[k]
              const p4 = availablePlayers[l]

              // Verificar se algum jogador já foi usado nesta rodada
              if (usedInRound.has(p1) || usedInRound.has(p2) || usedInRound.has(p3) || usedInRound.has(p4)) {
                continue
              }

              // Calcular pontuação desta combinação (priorizar novos parceiros)
              let score = 0
              if (!haveBeenPartners(p1, p2)) score += 2
              if (!haveBeenPartners(p3, p4)) score += 2
              if (!haveBeenPartners(p1, p3)) score += 1
              if (!haveBeenPartners(p1, p4)) score += 1
              if (!haveBeenPartners(p2, p3)) score += 1
              if (!haveBeenPartners(p2, p4)) score += 1

              if (score > bestScore) {
                bestScore = score
                bestPairing = {
                  player1: p1,
                  partner1: p2,
                  player2: p3,
                  partner2: p4
                }
              }
            }
          }
        }
      }

      if (bestPairing) {
        roundPairings.push(bestPairing)
        
        // Marcar jogadores como usados nesta rodada
        usedInRound.add(bestPairing.player1)
        usedInRound.add(bestPairing.partner1)
        usedInRound.add(bestPairing.player2)
        usedInRound.add(bestPairing.partner2)

        // Marcar como parceiros
        markAsPartners(bestPairing.player1, bestPairing.partner1)
        markAsPartners(bestPairing.player2, bestPairing.partner2)

        // Remover jogadores usados da lista disponível
        const usedPlayers = [bestPairing.player1, bestPairing.partner1, bestPairing.player2, bestPairing.partner2]
        usedPlayers.forEach(player => {
          const index = availablePlayers.indexOf(player)
          if (index > -1) {
            availablePlayers.splice(index, 1)
          }
        })
      } else {
        break // Não conseguiu formar mais duplas nesta rodada
      }
    }

    if (roundPairings.length > 0) {
      rounds.push(roundPairings)
    }

    // Verificar se todos já jogaram com todos pelo menos uma vez
    let allPaired = true
    for (let i = 0; i < players.length - 1; i++) {
      for (let j = i + 1; j < players.length; j++) {
        if (!haveBeenPartners(players[i], players[j])) {
          allPaired = false
          break
        }
      }
      if (!allPaired) break
    }

    // Se todos já foram parceiros pelo menos uma vez, podemos parar ou continuar para mais jogos
    if (allPaired && rounds.length >= Math.ceil(n / 2)) {
      break
    }
  }

  return rounds
}

// Função para calcular estatísticas do SUPER 8
export const calculateSuper8Stats = (
  players: string[], 
  matches: any[], 
  calcularEstatisticas: (score: string) => any
): Super8Stats[] => {
  const stats: Map<string, Super8Stats> = new Map()

  // Inicializar estatísticas
  players.forEach(playerId => {
    const playerName = playerId // Assumindo que o ID é o nome por simplicidade
    stats.set(playerId, {
      playerId,
      playerName,
      gamesWon: 0,
      gamesLost: 0,
      gamesBalance: 0,
      totalMatches: 0,
      defeats: 0,
      position: 0
    })
  })

  // Processar cada partida finalizada
  matches.filter(match => match.status === 'finalizada' && match.score).forEach(match => {
    const matchStats = calcularEstatisticas(match.score)
    if (!matchStats) return

    const team1Players = [match.player1Id, match.player1PartnerId].filter(Boolean)
    const team2Players = [match.player2Id, match.player2PartnerId].filter(Boolean)

    const team1Won = matchStats.winner === 1
    const team1Games = matchStats.games[0]
    const team2Games = matchStats.games[1]

    // Atualizar estatísticas para jogadores do time 1
    team1Players.forEach(playerId => {
      const playerStats = stats.get(playerId)
      if (playerStats) {
        playerStats.gamesWon += team1Games
        playerStats.gamesLost += team2Games
        playerStats.totalMatches += 1
        if (!team1Won) {
          playerStats.defeats += 1
        }
      }
    })

    // Atualizar estatísticas para jogadores do time 2
    team2Players.forEach(playerId => {
      const playerStats = stats.get(playerId)
      if (playerStats) {
        playerStats.gamesWon += team2Games
        playerStats.gamesLost += team1Games
        playerStats.totalMatches += 1
        if (team1Won) {
          playerStats.defeats += 1
        }
      }
    })
  })

  // Calcular saldo de games
  stats.forEach(playerStats => {
    playerStats.gamesBalance = playerStats.gamesWon - playerStats.gamesLost
  })

  // Converter para array e ordenar pelos critérios ITF
  const sortedStats = Array.from(stats.values()).sort((a, b) => {
    // 1. Maior saldo de games
    if (b.gamesBalance !== a.gamesBalance) {
      return b.gamesBalance - a.gamesBalance
    }
    
    // 2. Mais games vencidos
    if (b.gamesWon !== a.gamesWon) {
      return b.gamesWon - a.gamesWon
    }
    
    // 3. Menos derrotas
    if (a.defeats !== b.defeats) {
      return a.defeats - b.defeats
    }
    
    // 4. Mais jogos disputados (critério adicional)
    return b.totalMatches - a.totalMatches
  })

  // Atribuir posições
  sortedStats.forEach((playerStats, index) => {
    playerStats.position = index + 1
  })

  return sortedStats
}

// Função para validar se o torneio SUPER 8 pode ser iniciado
export const validateSuper8Tournament = (participantCount: number): { valid: boolean; message?: string } => {
  if (participantCount < 5) {
    return { valid: false, message: 'SUPER 8 requer mínimo de 5 jogadores' }
  }
  
  if (participantCount > 12) {
    return { valid: false, message: 'SUPER 8 permite máximo de 12 jogadores' }
  }
  
  return { valid: true }
}
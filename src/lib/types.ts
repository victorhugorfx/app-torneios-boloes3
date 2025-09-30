export interface User {
  id: string
  userId: string
  name: string
  email: string
  password: string
  avatar?: string
  isAdmin?: boolean
  canCreateTournaments: boolean
  trophies?: Trophy[]
}

export interface Trophy {
  type: 'champion' | 'runner-up'
  tournament: string
  date: Date
}

export interface Tournament {
  id: string
  name: string
  description: string
  category: 'iniciante' | 'intermediario' | 'avancado'
  gender: 'masculino' | 'feminino' | 'misto'
  type: 'individual' | 'duplas' | 'super8'
  status: 'criado' | 'andamento' | 'finalizado'
  createdBy: string
  maxParticipants?: number
  location?: string
  prize?: string
  setFormat?: string
  participants: Participant[]
  matches: Match[]
  groups: Group[]
  phase: 'grupos' | 'eliminatorias'
  createdAt: Date
  shareLink: string
}

export interface Participant {
  id: string
  userId: string
  userName: string
  partnerId?: string
  partnerName?: string
  partnerUserId?: string
  wins?: number
  losses?: number
  points?: number
  setsWon?: number
  setsLost?: number
  gamesWon?: number
  gamesLost?: number
  pointsWon?: number
  pointsLost?: number
  groupId?: string
  groupPosition?: number
  eliminated?: boolean
  // Campos específicos para SUPER 8
  gamesBalance?: number
  totalGamesPlayed?: number
  defeats?: number
}

export interface Match {
  id: string
  tournamentId: string
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  player1PartnerId?: string
  player2PartnerId?: string
  player1PartnerName?: string
  player2PartnerName?: string
  phase: 'grupos' | 'eliminatorias'
  status: 'pendente' | 'finalizada'
  score?: string
  groupId?: string
  round?: string
  roundNumber?: number
  scheduledDate?: Date
}

export interface Group {
  id: string
  name: string
  participants: string[]
  standings: Standing[]
  completed: boolean
}

export interface Standing {
  participantId: string
  participantName: string
  matchesWon: number
  matchesLost: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  pointsWon: number
  pointsLost: number
  setsPercentage: number
  gamesPercentage: number
  pointsDiff: number
  // Campos específicos para SUPER 8
  gamesBalance?: number
  totalGamesPlayed?: number
  defeats?: number
}

export interface Super8Stats {
  playerId: string
  playerName: string
  gamesWon: number
  gamesLost: number
  gamesBalance: number
  totalGamesPlayed: number
  defeats: number
}

export interface Super8Pairing {
  player1: string
  partner1: string
  player2: string
  partner2: string
}
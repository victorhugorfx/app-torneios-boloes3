"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  Plus, 
  UserPlus, 
  Play, 
  Crown, 
  Share2, 
  Edit3, 
  Trash2,
  LogIn,
  UserCheck,
  Target,
  Clock,
  Award,
  ChevronRight,
  Home,
  User,
  Shield,
  Zap,
  Star,
  TrendingUp,
  Activity,
  Medal,
  Users2,
  Calendar as CalendarIcon,
  MapPin,
  Timer,
  CheckCircle,
  XCircle,
  Shuffle,
  ArrowRight,
  RotateCcw,
  Swords,
  Hash,
  AlertTriangle,
  Menu,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  History,
  Copy,
  MessageCircle,
  ExternalLink,
  Move,
  Save,
  List,
  Filter
} from 'lucide-react'

// Importar funções do SUPER 8
import { generateSuper8Pairings, calculateSuper8Stats, validateSuper8Tournament } from '@/lib/super8'
import type { User, Tournament, Participant, Match, Group, Standing, Super8Stats } from '@/lib/types'

// Função para gerar ID único
const generateUserId = () => {
  return Math.random().toString(36).substr(2, 8).toUpperCase()
}

// Algoritmo ITF para distribuição de grupos - IMPLEMENTAÇÃO EXATA
const distribuirGrupos = (N: number): number[] => {
  if (N < 3) {
    throw new Error("mínimo 3 duplas")
  }
  if (3 <= N && N <= 5) {
    return [N] // um único grupo
  }

  const base_groups = Math.floor(N / 3) // máximo de grupos se todos tivessem 3
  const r = N % 3 // resto a distribuir

  if (r === 0) {
    return Array(base_groups).fill(3) // lista com base_groups itens = 3
  }

  if (base_groups >= r) {
    // distribui +1 em r grupos (ou seja: r grupos de 4 e o resto de 3)
    return [...Array(r).fill(4), ...Array(base_groups - r).fill(3)]
  } else {
    // caso raro; distribui o resto (até +2 por grupo) em ordem
    const groups = Array(base_groups).fill(3)
    let rem = r
    let i = 0
    while (rem > 0 && i < groups.length) {
      const add = Math.min(2, rem) // não passa de 5 no grupo
      groups[i] += add
      rem -= add
      i++
    }
    if (rem > 0) {
      // cria novo grupo com o que restar (será 1 ou 2)
      groups.push(rem)
    }
    return groups
  }
}

// Função para validar placares ITF Beach Tennis
const validarPlacarITF = (score: string): { valid: boolean; message?: string } => {
  if (!score || score.trim() === '') {
    return { valid: false, message: 'Placar não pode estar vazio' }
  }

  // Formatos aceitos:
  // "6-4 4-6 [10-8]" - 2 sets + match tie-break
  // "6-4 6-2" - 2 sets diretos
  // "6-4" - 1 set (formato especial)
  
  const matchTieBreakRegex = /^(\d+)-(\d+)\s+(\d+)-(\d+)\s+\[(\d+)-(\d+)\]$/
  const twoSetsRegex = /^(\d+)-(\d+)\s+(\d+)-(\d+)$/
  const oneSetRegex = /^(\d+)-(\d+)$/

  let match = score.match(matchTieBreakRegex)
  if (match) {
    const [, s1g1, s1g2, s2g1, s2g2, mtb1, mtb2] = match.map(Number)
    
    // Validar sets
    if (!validarSet(s1g1, s1g2) || !validarSet(s2g1, s2g2)) {
      return { valid: false, message: 'Sets devem terminar em 6 games (com vantagem de 2) ou tie-break 7-6' }
    }
    
    // Validar match tie-break
    if (!validarMatchTieBreak(mtb1, mtb2)) {
      return { valid: false, message: 'Match tie-break deve chegar a 10 pontos com vantagem de 2' }
    }
    
    // Verificar se houve empate 1-1 em sets
    const sets1 = (s1g1 > s1g2 ? 1 : 0) + (s2g1 > s2g2 ? 1 : 0)
    const sets2 = (s1g2 > s1g1 ? 1 : 0) + (s2g2 > s2g1 ? 1 : 0)
    
    if (sets1 !== 1 || sets2 !== 1) {
      return { valid: false, message: 'Match tie-break só é jogado quando há empate 1-1 em sets' }
    }
    
    return { valid: true }
  }

  match = score.match(twoSetsRegex)
  if (match) {
    const [, s1g1, s1g2, s2g1, s2g2] = match.map(Number)
    
    if (!validarSet(s1g1, s1g2) || !validarSet(s2g1, s2g2)) {
      return { valid: false, message: 'Sets devem terminar em 6 games (com vantagem de 2) ou tie-break 7-6' }
    }
    
    // Verificar se alguém venceu 2-0
    const sets1 = (s1g1 > s1g2 ? 1 : 0) + (s2g1 > s2g2 ? 1 : 0)
    const sets2 = (s1g2 > s1g1 ? 1 : 0) + (s2g2 > s2g1 ? 1 : 0)
    
    if (sets1 !== 2 && sets2 !== 2) {
      return { valid: false, message: 'Em 2 sets, um jogador deve vencer ambos (2-0)' }
    }
    
    return { valid: true }
  }

  match = score.match(oneSetRegex)
  if (match) {
    const [, g1, g2] = match.map(Number)
    
    if (!validarSet(g1, g2)) {
      return { valid: false, message: 'Set deve terminar em 6 games (com vantagem de 2) ou tie-break 7-6' }
    }
    
    return { valid: true }
  }

  return { valid: false, message: 'Formato de placar inválido. Use: "6-4 6-2", "6-4 4-6 [10-8]" ou "6-4"' }
}

// Validar um set individual
const validarSet = (games1: number, games2: number): boolean => {
  // Set normal: primeiro a 6 com vantagem de 2
  if (games1 >= 6 && games1 - games2 >= 2) return true
  if (games2 >= 6 && games2 - games1 >= 2) return true
  
  // Tie-break: 7-6
  if ((games1 === 7 && games2 === 6) || (games1 === 6 && games2 === 7)) return true
  
  return false
}

// Validar match tie-break
const validarMatchTieBreak = (points1: number, points2: number): boolean => {
  // Match tie-break: primeiro a 10 com vantagem de 2
  if (points1 >= 10 && points1 - points2 >= 2) return true
  if (points2 >= 10 && points2 - points1 >= 2) return true
  
  return false
}

// Função para calcular estatísticas de um placar
const calcularEstatisticas = (score: string) => {
  const matchTieBreakRegex = /^(\d+)-(\d+)\s+(\d+)-(\d+)\s+\[(\d+)-(\d+)\]$/
  const twoSetsRegex = /^(\d+)-(\d+)\s+(\d+)-(\d+)$/
  const oneSetRegex = /^(\d+)-(\d+)$/

  let match = score.match(matchTieBreakRegex)
  if (match) {
    const [, s1g1, s1g2, s2g1, s2g2, mtb1, mtb2] = match.map(Number)
    
    const sets1 = (s1g1 > s1g2 ? 1 : 0) + (s2g1 > s2g2 ? 1 : 0)
    const sets2 = (s1g2 > s1g1 ? 1 : 0) + (s2g2 > s2g1 ? 1 : 0)
    
    const winner = mtb1 > mtb2 ? 1 : 2
    const games1 = s1g1 + s2g1
    const games2 = s1g2 + s2g2
    
    return {
      winner,
      sets: winner === 1 ? [sets1 + 1, sets2] : [sets1, sets2 + 1],
      games: [games1, games2],
      points: [mtb1, mtb2] // Match tie-break points
    }
  }

  match = score.match(twoSetsRegex)
  if (match) {
    const [, s1g1, s1g2, s2g1, s2g2] = match.map(Number)
    
    const sets1 = (s1g1 > s1g2 ? 1 : 0) + (s2g1 > s2g2 ? 1 : 0)
    const sets2 = (s1g2 > s1g1 ? 1 : 0) + (s2g2 > s2g1 ? 1 : 0)
    
    const winner = sets1 > sets2 ? 1 : 2
    const games1 = s1g1 + s2g1
    const games2 = s1g2 + s2g2
    
    return {
      winner,
      sets: [sets1, sets2],
      games: [games1, games2],
      points: [0, 0] // Não há pontos especiais em sets normais
    }
  }

  match = score.match(oneSetRegex)
  if (match) {
    const [, g1, g2] = match.map(Number)
    
    const winner = g1 > g2 ? 1 : 2
    
    return {
      winner,
      sets: winner === 1 ? [1, 0] : [0, 1],
      games: [g1, g2],
      points: [0, 0]
    }
  }

  return null
}

// Função para copiar ID do usuário
const copyUserId = (userId: string) => {
  navigator.clipboard.writeText(userId)
  toast.success('ID copiado para a área de transferência!')
}

// Funções para gerenciar sessão no localStorage
const saveUserSession = (user: User) => {
  const sessionData = {
    user,
    timestamp: Date.now(),
    expiresIn: 24 * 60 * 60 * 1000 // 24 horas em milissegundos
  }
  localStorage.setItem('porronca_user_session', JSON.stringify(sessionData))
}

const loadUserSession = (): User | null => {
  try {
    const sessionData = localStorage.getItem('porronca_user_session')
    if (!sessionData) return null

    const { user, timestamp, expiresIn } = JSON.parse(sessionData)
    const now = Date.now()
    
    // Verificar se a sessão expirou (24 horas)
    if (now - timestamp > expiresIn) {
      localStorage.removeItem('porronca_user_session')
      return null
    }

    return user
  } catch (error) {
    console.error('Erro ao carregar sessão:', error)
    localStorage.removeItem('porronca_user_session')
    return null
  }
}

const clearUserSession = () => {
  localStorage.removeItem('porronca_user_session')
}

export default function PorroncaTorneios() {
  // Estados principais
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState('home')
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Estados de formulários
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' })
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    description: '',
    category: 'iniciante' as const,
    gender: 'misto' as const,
    type: 'individual' as const,
    maxParticipants: 16,
    location: '',
    prize: '',
    setFormat: 'melhor_3_sets' // Padrão ITF
  })

  // Estados de UI
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showCreateTournament, setShowCreateTournament] = useState(false)
  const [showJoinTournament, setShowJoinTournament] = useState(false)
  const [showMatchResult, setShowMatchResult] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [matchResult, setMatchResult] = useState({ score: '' })
  const [partnerUserId, setPartnerUserId] = useState('')

  // Estados específicos para SUPER 8
  const [super8Stats, setSuper8Stats] = useState<Super8Stats[]>([])

  // Estados para perfil
  const [showProfile, setShowProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados para configurações admin
  const [whatsappLink, setWhatsappLink] = useState('')

  // Estados para edição manual
  const [showManualEdit, setShowManualEdit] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)

  // Estados para "Todos os Torneios"
  const [showAllTournaments, setShowAllTournaments] = useState(false)
  const [tournamentFilter, setTournamentFilter] = useState<'todos' | 'finalizados' | 'andamento' | 'abertos'>('todos')

  // Função para criar usuários em massa
  const createMassUsers = () => {
    const names = [
      'Ana Silva', 'Bruno Costa', 'Carla Santos', 'Diego Oliveira', 'Elena Ferreira', 'Felipe Lima',
      'Gabriela Souza', 'Henrique Alves', 'Isabela Rocha', 'João Mendes', 'Karina Pereira', 'Lucas Barbosa',
      'Mariana Gomes', 'Nicolas Cardoso', 'Olivia Martins', 'Pedro Nascimento', 'Queila Ribeiro', 'Rafael Torres',
      'Sofia Campos', 'Thiago Moreira', 'Ursula Dias', 'Vitor Araújo', 'Wanda Freitas', 'Xavier Cunha',
      'Yasmin Lopes', 'Zeca Monteiro', 'Amanda Vieira', 'Bernardo Reis', 'Camila Teixeira', 'Daniel Correia',
      'Eduarda Pinto', 'Fabio Nunes', 'Giovanna Castro', 'Hugo Machado', 'Ingrid Azevedo', 'Julio Carvalho',
      'Kelly Rodrigues', 'Leonardo Farias', 'Melissa Ramos', 'Nathan Borges', 'Otavio Melo', 'Patricia Duarte',
      'Quintino Sá', 'Renata Moura', 'Samuel Tavares', 'Tatiana Vasconcelos', 'Ulisses Paiva', 'Vanessa Cruz'
    ]

    const newUsers: User[] = names.map((name, index) => ({
      id: `user_${index + 11}`,
      userId: generateUserId(),
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      password: '123456', // Senha padrão para usuários de teste
      canCreateTournaments: index % 5 === 0,
      trophies: [] // Inicializar array de troféus
    }))

    return newUsers
  }

  // Função para criar torneio teste com 24 duplas
  const createTestTournament = (users: User[]) => {
    const selectedUsers = users.slice(0, 48)
    const participants: Participant[] = []

    for (let i = 0; i < selectedUsers.length; i += 2) {
      if (selectedUsers[i + 1]) {
        participants.push({
          id: `participant_${i / 2 + 1}`,
          userId: selectedUsers[i].id,
          userName: selectedUsers[i].name,
          partnerId: selectedUsers[i + 1].id,
          partnerName: selectedUsers[i + 1].name,
          partnerUserId: selectedUsers[i + 1].userId,
          wins: 0,
          losses: 0,
          points: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          pointsWon: 0,
          pointsLost: 0
        })
      }
    }

    const testTournament: Tournament = {
      id: 'test_tournament_24',
      name: 'Torneio Teste Beach Tennis ITF - 24 Duplas',
      description: 'Torneio seguindo regras ITF 2025 para Beach Tennis com 24 duplas',
      category: 'intermediario',
      gender: 'misto',
      type: 'duplas',
      status: 'criado',
      createdBy: '1',
      maxParticipants: 24,
      location: 'Arena Beach Tennis ITF',
      prize: 'R$ 5.000 + Troféus ITF',
      setFormat: 'melhor_3_sets',
      participants,
      matches: [],
      groups: [],
      phase: 'grupos',
      createdAt: new Date(),
      shareLink: 'https://porronca.com/tournament/test_24_itf'
    }

    return testTournament
  }

  // Função para determinar campeão e vice-campeão
  const getTournamentWinners = (tournament: Tournament) => {
    if (tournament.status !== 'finalizado') return null

    // Para torneios finalizados, procurar pela final
    const finalMatch = tournament.matches.find(m => m.round === 'final' && m.status === 'finalizada')
    
    if (finalMatch) {
      const stats = calcularEstatisticas(finalMatch.score!)
      if (stats) {
        const championId = stats.winner === 1 ? finalMatch.player1Id : finalMatch.player2Id
        const runnerUpId = stats.winner === 1 ? finalMatch.player2Id : finalMatch.player1Id
        
        const champion = tournament.participants.find(p => p.id === championId)
        const runnerUp = tournament.participants.find(p => p.id === runnerUpId)
        
        return {
          champion: champion ? {
            name: champion.partnerName ? `${champion.userName} & ${champion.partnerName}` : champion.userName,
            userId: champion.userId,
            partnerId: champion.partnerId
          } : null,
          runnerUp: runnerUp ? {
            name: runnerUp.partnerName ? `${runnerUp.userName} & ${runnerUp.partnerName}` : runnerUp.userName,
            userId: runnerUp.userId,
            partnerId: runnerUp.partnerId
          } : null
        }
      }
    }

    // Para SUPER 8 ou torneios sem eliminatórias, usar classificação dos grupos
    if (tournament.groups.length > 0) {
      const mainGroup = tournament.groups[0]
      const sortedStandings = [...mainGroup.standings].sort((a, b) => {
        if (tournament.type === 'super8') {
          if ((b.gamesBalance || 0) !== (a.gamesBalance || 0)) {
            return (b.gamesBalance || 0) - (a.gamesBalance || 0)
          }
          if ((b.gamesWon || 0) !== (a.gamesWon || 0)) {
            return (b.gamesWon || 0) - (a.gamesWon || 0)
          }
          return (a.defeats || 0) - (b.defeats || 0)
        } else {
          if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon
          if (b.setsPercentage !== a.setsPercentage) return b.setsPercentage - a.setsPercentage
          if (b.gamesPercentage !== a.gamesPercentage) return b.gamesPercentage - a.gamesPercentage
          return b.pointsDiff - a.pointsDiff
        }
      })

      if (sortedStandings.length >= 2) {
        const champion = tournament.participants.find(p => p.id === sortedStandings[0].participantId)
        const runnerUp = tournament.participants.find(p => p.id === sortedStandings[1].participantId)
        
        return {
          champion: champion ? {
            name: champion.partnerName ? `${champion.userName} & ${champion.partnerName}` : champion.userName,
            userId: champion.userId,
            partnerId: champion.partnerId
          } : null,
          runnerUp: runnerUp ? {
            name: runnerUp.partnerName ? `${runnerUp.userName} & ${runnerUp.partnerName}` : runnerUp.userName,
            userId: runnerUp.userId,
            partnerId: runnerUp.partnerId
          } : null
        }
      }
    }

    return null
  }

  // Função para adicionar troféu ao perfil do usuário
  const addTrophyToUser = (userId: string, trophy: { type: 'champion' | 'runner-up', tournament: string, date: Date }) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const trophies = user.trophies || []
        return {
          ...user,
          trophies: [...trophies, trophy]
        }
      }
      return user
    }))
  }

  // Função para filtrar torneios
  const getFilteredTournaments = () => {
    switch (tournamentFilter) {
      case 'finalizados':
        return tournaments.filter(t => t.status === 'finalizado')
      case 'andamento':
        return tournaments.filter(t => t.status === 'andamento')
      case 'abertos':
        return tournaments.filter(t => t.status === 'criado')
      default:
        return tournaments
    }
  }

  // Inicialização
  useEffect(() => {
    // Tentar carregar sessão salva
    const savedUser = loadUserSession()
    if (savedUser) {
      setCurrentUser(savedUser)
    }

    const baseUsers: User[] = [
      { id: '1', userId: generateUserId(), name: 'Admin ITF', email: 'admin@porronca.com', password: 'admin', isAdmin: true, canCreateTournaments: true, trophies: [] },
      { id: '2', userId: generateUserId(), name: 'João Silva', email: 'joao@email.com', password: '123456', canCreateTournaments: true, trophies: [] },
      { id: '3', userId: generateUserId(), name: 'Maria Santos', email: 'maria@email.com', password: '123456', canCreateTournaments: false, trophies: [] },
      { id: '4', userId: generateUserId(), name: 'Pedro Costa', email: 'pedro@email.com', password: '123456', canCreateTournaments: false, trophies: [] },
      { id: '5', userId: generateUserId(), name: 'Ana Oliveira', email: 'ana@email.com', password: '123456', canCreateTournaments: true, trophies: [] },
      { id: '6', userId: generateUserId(), name: 'Carlos Mendes', email: 'carlos@email.com', password: '123456', canCreateTournaments: false, trophies: [] },
      { id: '7', userId: generateUserId(), name: 'Lucia Ferreira', email: 'lucia@email.com', password: '123456', canCreateTournaments: false, trophies: [] },
      { id: '8', userId: generateUserId(), name: 'Roberto Lima', email: 'roberto@email.com', password: '123456', canCreateTournaments: false, trophies: [] },
      { id: '9', userId: generateUserId(), name: 'Fernanda Souza', email: 'fernanda@email.com', password: '123456', canCreateTournaments: false, trophies: [] },
      { id: '10', userId: generateUserId(), name: 'Marcos Pereira', email: 'marcos@email.com', password: '123456', canCreateTournaments: false, trophies: [] }
    ]

    const massUsers = createMassUsers()
    const allUsers = [...baseUsers, ...massUsers]
    setUsers(allUsers)

    const testTournament = createTestTournament(allUsers)

    const sampleTournaments: Tournament[] = [
      {
        id: '1',
        name: 'Copa Beach Tennis ITF 2024',
        description: 'Torneio oficial seguindo regras ITF 2025',
        category: 'iniciante',
        gender: 'misto',
        type: 'duplas',
        status: 'criado',
        createdBy: '2',
        maxParticipants: 16,
        location: 'Arena Beach Sports ITF',
        prize: 'R$ 2.000 + Troféu ITF',
        setFormat: 'melhor_3_sets',
        participants: [
          { id: '1', userId: '2', userName: 'João Silva', partnerId: '3', partnerName: 'Maria Santos', partnerUserId: allUsers.find(u => u.id === '3')?.userId, wins: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, pointsWon: 0, pointsLost: 0 },
          { id: '2', userId: '4', userName: 'Pedro Costa', partnerId: '1', partnerName: 'Admin ITF', partnerUserId: allUsers.find(u => u.id === '1')?.userId, wins: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, pointsWon: 0, pointsLost: 0 },
          { id: '3', userId: '5', userName: 'Ana Oliveira', partnerId: '6', partnerName: 'Carlos Mendes', partnerUserId: allUsers.find(u => u.id === '6')?.userId, wins: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, pointsWon: 0, pointsLost: 0 },
          { id: '4', userId: '7', userName: 'Lucia Ferreira', partnerId: '8', partnerName: 'Roberto Lima', partnerUserId: allUsers.find(u => u.id === '8')?.userId, wins: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, pointsWon: 0, pointsLost: 0 },
          { id: '5', userId: '9', userName: 'Fernanda Souza', partnerId: '10', partnerName: 'Marcos Pereira', partnerUserId: allUsers.find(u => u.id === '10')?.userId, wins: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, pointsWon: 0, pointsLost: 0 }
        ],
        matches: [],
        groups: [],
        phase: 'grupos',
        createdAt: new Date('2024-01-10'),
        shareLink: 'https://porronca.com/tournament/1'
      },
      testTournament
    ]
    setTournaments(sampleTournaments)

    // Carregar configurações do localStorage
    const savedWhatsappLink = localStorage.getItem('porronca_whatsapp_link')
    if (savedWhatsappLink) {
      setWhatsappLink(savedWhatsappLink)
    }
  }, [])

  // Funções de autenticação
  const handleLogin = () => {
    const user = users.find(u => u.email === loginForm.email && u.password === loginForm.password)
    if (user) {
      setCurrentUser(user)
      saveUserSession(user) // Salvar sessão no localStorage
      setShowLogin(false)
      toast.success(`Bem-vindo ao PORRONCA TORNEIOS ITF, ${user.name}!`)
    } else {
      toast.error('Email ou senha incorretos')
    }
  }

  const handleRegister = () => {
    const newUser: User = {
      id: Date.now().toString(),
      userId: generateUserId(),
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      canCreateTournaments: false,
      trophies: []
    }
    setUsers([...users, newUser])
    setCurrentUser(newUser)
    saveUserSession(newUser) // Salvar sessão no localStorage
    setShowRegister(false)
    toast.success('Conta criada com sucesso no PORRONCA TORNEIOS ITF!')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    clearUserSession() // Limpar sessão do localStorage
    setActiveTab('home')
    setMobileMenuOpen(false)
    toast.success('Logout realizado')
  }

  // Função para atualizar perfil
  const handleUpdateProfile = () => {
    if (!currentUser) return

    // Validar senha atual
    if (profileForm.currentPassword && currentUser.password !== profileForm.currentPassword) {
      toast.error('Senha atual incorreta')
      return
    }

    // Validar nova senha
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      toast.error('Nova senha e confirmação não coincidem')
      return
    }

    // Atualizar usuário
    const updatedUser = {
      ...currentUser,
      name: profileForm.name || currentUser.name,
      password: profileForm.newPassword || currentUser.password
    }

    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u))
    setCurrentUser(updatedUser)
    saveUserSession(updatedUser) // Atualizar sessão no localStorage
    
    // Limpar formulário
    setProfileForm({
      name: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    toast.success('Perfil atualizado com sucesso!')
    setShowProfile(false)
  }

  // Função para salvar configurações do WhatsApp
  const handleSaveWhatsappLink = () => {
    localStorage.setItem('porronca_whatsapp_link', whatsappLink)
    toast.success('Link do WhatsApp salvo com sucesso!')
  }

  // Função para abrir WhatsApp
  const handleWhatsAppClick = () => {
    if (whatsappLink) {
      window.open(whatsappLink, '_blank')
    } else {
      toast.error('Link do WhatsApp não configurado')
    }
  }

  // Função para obter histórico de torneios do usuário
  const getUserTournamentHistory = () => {
    if (!currentUser) return []

    return tournaments.filter(tournament => 
      tournament.participants.some(p => p.userId === currentUser.id)
    ).map(tournament => {
      const participant = tournament.participants.find(p => p.userId === currentUser.id)
      let position = 'Participante'
      
      if (tournament.status === 'finalizado') {
        // Calcular posição final baseada nos grupos ou eliminatórias
        if (participant?.groupPosition) {
          position = `${participant.groupPosition}º lugar no grupo`
        }
        if (participant?.eliminated === false) {
          position = 'Classificado para eliminatórias'
        }
        if (participant?.eliminated === true) {
          position = 'Eliminado'
        }
      } else if (tournament.status === 'andamento') {
        position = 'Em andamento'
      }

      return {
        tournament,
        participant,
        position
      }
    })
  }

  // Função para gerar grupos usando algoritmo ITF - COM RESPOSTA RÁPIDA
  const generateGroups = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) return

    const participants = tournament.participants
    
    if (participants.length < 3) {
      toast.error(`Mínimo de 3 ${tournament.type === 'duplas' ? 'duplas' : 'participantes'} necessário para iniciar o torneio`)
      return
    }

    try {
      // Usar algoritmo ITF para distribuição
      const groupSizes = distribuirGrupos(participants.length)
      
      // Embaralhar participantes
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)
      
      // Criar grupos
      const groups: Group[] = []
      let participantIndex = 0

      groupSizes.forEach((size, index) => {
        const groupName = String.fromCharCode(65 + index) // A, B, C, etc.
        const groupParticipants = shuffledParticipants.slice(participantIndex, participantIndex + size)
        participantIndex += size

        const group: Group = {
          id: groupName,
          name: `Grupo ${groupName}`,
          participants: groupParticipants.map(p => p.id),
          standings: groupParticipants.map(p => ({
            participantId: p.id,
            participantName: p.partnerName ? `${p.userName} & ${p.partnerName}` : p.userName,
            matchesWon: 0,
            matchesLost: 0,
            setsWon: 0,
            setsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
            pointsWon: 0,
            pointsLost: 0,
            setsPercentage: 0,
            gamesPercentage: 0,
            pointsDiff: 0
          })),
          completed: false
        }

        groups.push(group)
      })

      // Atualizar participantes com groupId
      const updatedParticipants = participants.map(p => {
        const group = groups.find(g => g.participants.includes(p.id))
        return { ...p, groupId: group?.id }
      })

      // Gerar jogos da fase de grupos (round-robin)
      const matches: Match[] = []
      groups.forEach(group => {
        const groupParticipants = group.participants
        
        // Todos contra todos no grupo: g*(g-1)/2 jogos
        for (let i = 0; i < groupParticipants.length; i++) {
          for (let j = i + 1; j < groupParticipants.length; j++) {
            const p1 = updatedParticipants.find(p => p.id === groupParticipants[i])!
            const p2 = updatedParticipants.find(p => p.id === groupParticipants[j])!
            
            matches.push({
              id: `match_${Date.now()}_${i}_${j}_${group.id}`,
              tournamentId,
              player1Id: p1.id,
              player2Id: p2.id,
              player1Name: p1.partnerName ? `${p1.userName} & ${p1.partnerName}` : p1.userName,
              player2Name: p2.partnerName ? `${p2.userName} & ${p2.partnerName}` : p2.userName,
              phase: 'grupos',
              status: 'pendente',
              groupId: group.id,
              scheduledDate: new Date(Date.now() + (matches.length * 24 * 60 * 60 * 1000))
            })
          }
        }
      })

      const updatedTournament = {
        ...tournament,
        participants: updatedParticipants,
        groups,
        matches,
        status: 'andamento' as const
      }

      setTournaments(tournaments.map(t => t.id === tournamentId ? updatedTournament : t))
      
      if (selectedTournament && selectedTournament.id === tournamentId) {
        setSelectedTournament(updatedTournament)
      }
      
      const groupInfo = groupSizes.map((size, index) => `Grupo ${String.fromCharCode(65 + index)}: ${size} ${tournament.type === 'duplas' ? 'duplas' : 'participantes'}`).join(', ')
      toast.success(`Grupos gerados seguindo regras ITF! ${groups.length} grupos criados. ${groupInfo}`)
      
      // RESPOSTA RÁPIDA: Mostrar seção de grupos imediatamente
      if (selectedTournament && selectedTournament.id === tournamentId) {
        // Scroll para a seção de classificação
        setTimeout(() => {
          const standingsTab = document.querySelector('[value="standings"]') as HTMLElement
          if (standingsTab) {
            standingsTab.click()
          }
        }, 500)
      }
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar grupos')
    }
  }

  // Função para gerar torneio SUPER 8 - COM RESPOSTA RÁPIDA
  const generateSuper8Tournament = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) return

    const participants = tournament.participants
    const validation = validateSuper8Tournament(participants.length)
    
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    try {
      // Gerar combinações de duplas para todas as rodadas
      const playerIds = participants.map(p => p.id)
      const pairings = generateSuper8Pairings(playerIds)
      
      const matches: Match[] = []
      
      pairings.forEach((roundPairings, roundIndex) => {
        roundPairings.forEach((pairing, matchIndex) => {
          const p1 = participants.find(p => p.id === pairing.player1)!
          const p2 = participants.find(p => p.id === pairing.partner1)!
          const p3 = participants.find(p => p.id === pairing.player2)!
          const p4 = participants.find(p => p.id === pairing.partner2)!
          
          matches.push({
            id: `super8_${Date.now()}_${roundIndex}_${matchIndex}`,
            tournamentId,
            player1Id: p1.id,
            player2Id: p3.id,
            player1Name: p1.userName,
            player2Name: p3.userName,
            player1PartnerId: p2.id,
            player2PartnerId: p4.id,
            player1PartnerName: p2.userName,
            player2PartnerName: p4.userName,
            phase: 'grupos',
            status: 'pendente',
            roundNumber: roundIndex + 1,
            scheduledDate: new Date(Date.now() + (matches.length * 24 * 60 * 60 * 1000))
          })
        })
      })

      // Criar um único grupo para SUPER 8
      const group: Group = {
        id: 'SUPER8',
        name: 'SUPER 8 - Grupo Único',
        participants: participants.map(p => p.id),
        standings: participants.map(p => ({
          participantId: p.id,
          participantName: p.userName,
          matchesWon: 0,
          matchesLost: 0,
          setsWon: 0,
          setsLost: 0,
          gamesWon: 0,
          gamesLost: 0,
          pointsWon: 0,
          pointsLost: 0,
          setsPercentage: 0,
          gamesPercentage: 0,
          pointsDiff: 0,
          gamesBalance: 0,
          totalGamesPlayed: 0,
          defeats: 0
        })),
        completed: false
      }

      const updatedTournament = {
        ...tournament,
        groups: [group],
        matches,
        status: 'andamento' as const
      }

      setTournaments(tournaments.map(t => t.id === tournamentId ? updatedTournament : t))
      
      if (selectedTournament && selectedTournament.id === tournamentId) {
        setSelectedTournament(updatedTournament)
      }
      
      toast.success(`SUPER 8 iniciado! ${matches.length} jogos gerados em ${pairings.length} rodadas. Todos jogarão com todos!`)
      
      // RESPOSTA RÁPIDA: Mostrar seção de jogos imediatamente
      if (selectedTournament && selectedTournament.id === tournamentId) {
        setTimeout(() => {
          const matchesTab = document.querySelector('[value="matches"]') as HTMLElement
          if (matchesTab) {
            matchesTab.click()
          }
        }, 500)
      }
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar SUPER 8')
    }
  }

  // Função para gerar chaveamento das eliminatórias - CORRIGIDA COM LÓGICA EXATA
  const generateBracket = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) return

    const groupMatches = tournament.matches.filter(m => m.phase === 'grupos')
    const allGroupMatchesCompleted = groupMatches.every(m => m.status === 'finalizada')

    if (!allGroupMatchesCompleted) {
      toast.error('Todos os jogos da fase de grupos devem ser finalizados antes de gerar o chaveamento')
      return
    }

    // PASSO 1: Classificar APENAS os que avançaram da fase de grupos
    const qualifiedParticipants: Participant[] = []
    
    tournament.groups.forEach(group => {
      // Aplicar critérios de desempate ITF
      const sortedStandings = [...group.standings].sort((a, b) => {
        // 1. Número de partidas vencidas
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon
        
        // 2. Percentual de sets vencidos
        if (b.setsPercentage !== a.setsPercentage) return b.setsPercentage - a.setsPercentage
        
        // 3. Percentual de games vencidos
        if (b.gamesPercentage !== a.gamesPercentage) return b.gamesPercentage - a.gamesPercentage
        
        // 4. Diferença de pontos
        return b.pointsDiff - a.pointsDiff
      })

      // APENAS os 2 primeiros colocados se classificam
      sortedStandings.forEach((standing, index) => {
        const participant = tournament.participants.find(p => p.id === standing.participantId)
        if (participant) {
          participant.groupPosition = index + 1
          if (index < 2) { // Apenas 1º e 2º se classificam
            participant.eliminated = false
            qualifiedParticipants.push(participant)
          } else {
            participant.eliminated = true // 3º lugar em diante são eliminados
          }
        }
      })
    })

    const totalQualified = qualifiedParticipants.length
    
    if (totalQualified < 2) {
      toast.error('Não há classificados suficientes para gerar eliminatórias')
      return
    }

    // PASSO 2: Determinar a fase inicial correta baseada no número de classificados
    let initialRound = ''
    let targetSize = 0
    
    if (totalQualified <= 2) {
      initialRound = 'final'
      targetSize = 2
    } else if (totalQualified <= 4) {
      initialRound = 'semifinal'
      targetSize = 4
    } else if (totalQualified <= 8) {
      initialRound = 'quartas'
      targetSize = 8
    } else if (totalQualified <= 16) {
      initialRound = 'oitavas'
      targetSize = 16
    } else if (totalQualified <= 32) {
      initialRound = '16avos'
      targetSize = 32
    } else {
      initialRound = '32avos'
      targetSize = 64
    }

    // PASSO 3: Aplicar sistema de BYE corretamente
    const playersNeedingBye = targetSize - totalQualified
    
    // Separar 1º e 2º colocados para semeamento
    const firstPlaced = qualifiedParticipants.filter(p => p.groupPosition === 1)
    const secondPlaced = qualifiedParticipants.filter(p => p.groupPosition === 2)
    
    // Ordenar 1º colocados por critérios ITF (melhores ficam com bye)
    const sortedFirstPlaced = firstPlaced.sort((a, b) => {
      if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0)
      if ((b.setsWon || 0) !== (a.setsWon || 0)) return (b.setsWon || 0) - (a.setsWon || 0)
      return ((b.gamesWon || 0) - (b.gamesLost || 0)) - ((a.gamesWon || 0) - (a.gamesLost || 0))
    })
    
    // Aplicar BYE aos melhores 1º colocados
    const playersWithBye = sortedFirstPlaced.slice(0, playersNeedingBye)
    const playersToPlay = [
      ...sortedFirstPlaced.slice(playersNeedingBye),
      ...secondPlaced
    ]

    // PASSO 4: Gerar jogos da fase inicial (sem confrontos desnecessários)
    const eliminationMatches: Match[] = []
    
    // Embaralhar evitando confrontos do mesmo grupo quando possível
    const shuffledPlayersToPlay = [...playersToPlay].sort(() => Math.random() - 0.5)
    
    // Criar confrontos apenas para quem precisa jogar
    for (let i = 0; i < shuffledPlayersToPlay.length; i += 2) {
      if (shuffledPlayersToPlay[i + 1]) {
        const p1 = shuffledPlayersToPlay[i]
        const p2 = shuffledPlayersToPlay[i + 1]
        
        eliminationMatches.push({
          id: `elimination_${Date.now()}_${i}`,
          tournamentId,
          player1Id: p1.id,
          player2Id: p2.id,
          player1Name: p1.partnerName ? `${p1.userName} & ${p1.partnerName}` : p1.userName,
          player2Name: p2.partnerName ? `${p2.userName} & ${p2.partnerName}` : p2.userName,
          phase: 'eliminatorias',
          status: 'pendente',
          round: initialRound,
          scheduledDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000))
        })
      }
    }

    const updatedTournament = {
      ...tournament,
      matches: [...tournament.matches, ...eliminationMatches],
      phase: 'eliminatorias' as const
    }

    setTournaments(tournaments.map(t => t.id === tournamentId ? updatedTournament : t))
    
    if (selectedTournament && selectedTournament.id === tournamentId) {
      setSelectedTournament(updatedTournament)
    }
    
    let message = `Chaveamento ITF gerado! ${eliminationMatches.length} jogos das ${initialRound} criados`
    if (playersWithBye.length > 0) {
      message += `. ${playersWithBye.length} duplas com melhor campanha passaram direto (bye)`
    }
    
    toast.success(message)
    
    // RESPOSTA RÁPIDA: Mostrar seção de jogos das eliminatórias imediatamente
    if (selectedTournament && selectedTournament.id === tournamentId) {
      setTimeout(() => {
        const matchesTab = document.querySelector('[value="matches"]') as HTMLElement
        if (matchesTab) {
          matchesTab.click()
        }
      }, 500)
    }
  }

  // Função para criar torneio
  const handleCreateTournament = () => {
    if (!currentUser?.canCreateTournaments) {
      toast.error('Você não tem permissão para criar torneios')
      return
    }

    // Ajustar maxParticipants para SUPER 8
    let maxParticipants = tournamentForm.maxParticipants
    if (tournamentForm.type === 'super8') {
      maxParticipants = Math.min(Math.max(maxParticipants, 5), 12) // Entre 5 e 12 para SUPER 8
    }

    const newTournament: Tournament = {
      id: Date.now().toString(),
      ...tournamentForm,
      maxParticipants,
      status: 'criado',
      createdBy: currentUser.id,
      participants: [],
      matches: [],
      groups: [],
      phase: 'grupos',
      createdAt: new Date(),
      shareLink: `https://porronca.com/tournament/${Date.now()}`
    }

    setTournaments([...tournaments, newTournament])
    setShowCreateTournament(false)
    setTournamentForm({ 
      name: '', 
      description: '', 
      category: 'iniciante', 
      gender: 'misto',
      type: 'individual',
      maxParticipants: 16,
      location: '',
      prize: '',
      setFormat: 'melhor_3_sets'
    })
    toast.success(`Torneio ${tournamentForm.type === 'super8' ? 'SUPER 8' : 'ITF'} criado com sucesso!`)
  }

  // Função para inscrição em torneio
  const handleJoinTournament = (tournamentId: string) => {
    if (!currentUser) return

    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament) return

    if (tournament.participants.length >= (tournament.maxParticipants || 16)) {
      toast.error('Torneio lotado!')
      return
    }

    // Verificar se já está inscrito
    const alreadyRegistered = tournament.participants.some(p => p.userId === currentUser.id)
    if (alreadyRegistered) {
      toast.error('Você já está inscrito neste torneio')
      return
    }

    if (tournament.type === 'duplas') {
      if (!partnerUserId) {
        toast.error('Para torneios de dupla, você deve fornecer o ID do seu parceiro')
        return
      }

      const partner = users.find(u => u.userId === partnerUserId)
      if (!partner) {
        toast.error('Parceiro não encontrado. Verifique o ID fornecido')
        return
      }

      const partnerAlreadyRegistered = tournament.participants.some(p => p.userId === partner.id)
      if (partnerAlreadyRegistered) {
        toast.error('Seu parceiro já está inscrito neste torneio')
        return
      }

      const newParticipant: Participant = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        partnerId: partner.id,
        partnerName: partner.name,
        partnerUserId: partner.userId,
        wins: 0,
        losses: 0,
        points: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsWon: 0,
        pointsLost: 0
      }

      const updatedTournament = {
        ...tournament,
        participants: [...tournament.participants, newParticipant]
      }

      setTournaments(tournaments.map(t => t.id === tournamentId ? updatedTournament : t))
      setPartnerUserId('')
      toast.success(`Dupla ${currentUser.name} & ${partner.name} inscrita com sucesso!`)
    } else {
      const newParticipant: Participant = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        wins: 0,
        losses: 0,
        points: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        // Campos específicos para SUPER 8
        gamesBalance: 0,
        totalGamesPlayed: 0,
        defeats: 0
      }

      const updatedTournament = {
        ...tournament,
        participants: [...tournament.participants, newParticipant]
      }

      setTournaments(tournaments.map(t => t.id === tournamentId ? updatedTournament : t))
      toast.success('Inscrição realizada com sucesso!')
    }
  }

  // Função para salvar resultado do jogo com validação ITF
  const saveMatchResult = (match: Match, score: string) => {
    const tournament = tournaments.find(t => t.id === match.tournamentId)
    if (!tournament) return

    // Validar placar ITF
    const validation = validarPlacarITF(score)
    if (!validation.valid) {
      toast.error(`Placar inválido segundo as regras ITF: ${validation.message}`)
      return
    }

    // Calcular estatísticas
    const stats = calcularEstatisticas(score)
    if (!stats) {
      toast.error('Erro ao processar estatísticas do placar')
      return
    }

    const updatedMatch = {
      ...match,
      score,
      status: 'finalizada' as const
    }

    const updatedMatches = tournament.matches.map(m => 
      m.id === match.id ? updatedMatch : m
    )

    // Atualizar estatísticas dos participantes
    let updatedParticipants = [...tournament.participants]

    if (tournament.type === 'super8') {
      // Lógica específica para SUPER 8
      const team1Players = [match.player1Id, match.player1PartnerId].filter(Boolean)
      const team2Players = [match.player2Id, match.player2PartnerId].filter(Boolean)

      const team1Won = stats.winner === 1
      const team1Games = stats.games[0]
      const team2Games = stats.games[1]

      // Atualizar estatísticas para jogadores do time 1
      team1Players.forEach(playerId => {
        const participantIndex = updatedParticipants.findIndex(p => p.id === playerId)
        if (participantIndex !== -1) {
          const participant = updatedParticipants[participantIndex]
          updatedParticipants[participantIndex] = {
            ...participant,
            gamesWon: (participant.gamesWon || 0) + team1Games,
            gamesLost: (participant.gamesLost || 0) + team2Games,
            totalGamesPlayed: (participant.totalGamesPlayed || 0) + 1,
            defeats: !team1Won ? (participant.defeats || 0) + 1 : (participant.defeats || 0),
            gamesBalance: ((participant.gamesWon || 0) + team1Games) - ((participant.gamesLost || 0) + team2Games)
          }
        }
      })

      // Atualizar estatísticas para jogadores do time 2
      team2Players.forEach(playerId => {
        const participantIndex = updatedParticipants.findIndex(p => p.id === playerId)
        if (participantIndex !== -1) {
          const participant = updatedParticipants[participantIndex]
          updatedParticipants[participantIndex] = {
            ...participant,
            gamesWon: (participant.gamesWon || 0) + team2Games,
            gamesLost: (participant.gamesLost || 0) + team1Games,
            totalGamesPlayed: (participant.totalGamesPlayed || 0) + 1,
            defeats: team1Won ? (participant.defeats || 0) + 1 : (participant.defeats || 0),
            gamesBalance: ((participant.gamesWon || 0) + team2Games) - ((participant.gamesLost || 0) + team1Games)
          }
        }
      })

      // Calcular estatísticas SUPER 8
      const playerIds = tournament.participants.map(p => p.id)
      const super8StatsCalculated = calculateSuper8Stats(playerIds, updatedMatches, calcularEstatisticas)
      setSuper8Stats(super8StatsCalculated)

    } else {
      // Lógica original para torneios normais
      updatedParticipants = tournament.participants.map(p => {
        if (p.id === match.player1Id) {
          const won = stats.winner === 1
          return {
            ...p,
            wins: won ? (p.wins || 0) + 1 : p.wins || 0,
            losses: !won ? (p.losses || 0) + 1 : p.losses || 0,
            points: won ? (p.points || 0) + 3 : (p.points || 0), // 3 pontos por vitória no RR
            setsWon: (p.setsWon || 0) + stats.sets[0],
            setsLost: (p.setsLost || 0) + stats.sets[1],
            gamesWon: (p.gamesWon || 0) + stats.games[0],
            gamesLost: (p.gamesLost || 0) + stats.games[1],
            pointsWon: (p.pointsWon || 0) + stats.points[0],
            pointsLost: (p.pointsLost || 0) + stats.points[1]
          }
        }
        if (p.id === match.player2Id) {
          const won = stats.winner === 2
          return {
            ...p,
            wins: won ? (p.wins || 0) + 1 : p.wins || 0,
            losses: !won ? (p.losses || 0) + 1 : p.losses || 0,
            points: won ? (p.points || 0) + 3 : (p.points || 0),
            setsWon: (p.setsWon || 0) + stats.sets[1],
            setsLost: (p.setsLost || 0) + stats.sets[0],
            gamesWon: (p.gamesWon || 0) + stats.games[1],
            gamesLost: (p.gamesLost || 0) + stats.games[0],
            pointsWon: (p.pointsWon || 0) + stats.points[1],
            pointsLost: (p.pointsLost || 0) + stats.points[0]
          }
        }
        return p
      })
    }

    // Atualizar standings dos grupos
    let updatedGroups = tournament.groups
    if (match.groupId) {
      updatedGroups = tournament.groups.map(group => {
        if (group.id === match.groupId) {
          const updatedStandings = group.standings.map(standing => {
            const participant = updatedParticipants.find(p => p.id === standing.participantId)
            if (participant) {
              if (tournament.type === 'super8') {
                return {
                  ...standing,
                  gamesWon: participant.gamesWon || 0,
                  gamesLost: participant.gamesLost || 0,
                  gamesBalance: participant.gamesBalance || 0,
                  totalGamesPlayed: participant.totalGamesPlayed || 0,
                  defeats: participant.defeats || 0
                }
              } else {
                const setsPlayed = (participant.setsWon || 0) + (participant.setsLost || 0)
                const gamesPlayed = (participant.gamesWon || 0) + (participant.gamesLost || 0)
                
                return {
                  ...standing,
                  matchesWon: participant.wins || 0,
                  matchesLost: participant.losses || 0,
                  setsWon: participant.setsWon || 0,
                  setsLost: participant.setsLost || 0,
                  gamesWon: participant.gamesWon || 0,
                  gamesLost: participant.gamesLost || 0,
                  pointsWon: participant.pointsWon || 0,
                  pointsLost: participant.pointsLost || 0,
                  setsPercentage: setsPlayed > 0 ? (participant.setsWon || 0) / setsPlayed : 0,
                  gamesPercentage: gamesPlayed > 0 ? (participant.gamesWon || 0) / gamesPlayed : 0,
                  pointsDiff: (participant.pointsWon || 0) - (participant.pointsLost || 0)
                }
              }
            }
            return standing
          })

          return { ...group, standings: updatedStandings }
        }
        return group
      })
    }

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      participants: updatedParticipants,
      groups: updatedGroups
    }

    setTournaments(tournaments.map(t => t.id === tournament.id ? updatedTournament : t))
    
    if (selectedTournament && selectedTournament.id === tournament.id) {
      setSelectedTournament(updatedTournament)
    }
    
    toast.success(`Resultado ${tournament.type === 'super8' ? 'SUPER 8' : 'ITF'} registrado com sucesso!`)
  }

  // Função para salvar resultado das eliminatórias - CORRIGIDA PARA FINAL ÚNICA
  const saveEliminationMatchResult = (match: Match, score: string) => {
    const tournament = tournaments.find(t => t.id === match.tournamentId)
    if (!tournament) return

    // Validar placar ITF
    const validation = validarPlacarITF(score)
    if (!validation.valid) {
      toast.error(`Placar inválido segundo as regras ITF: ${validation.message}`)
      return
    }

    const stats = calcularEstatisticas(score)
    if (!stats) {
      toast.error('Erro ao processar estatísticas do placar')
      return
    }

    const updatedMatch = {
      ...match,
      score,
      status: 'finalizada' as const
    }

    const updatedMatches = tournament.matches.map(m => 
      m.id === match.id ? updatedMatch : m
    )

    // Determinar vencedor
    const winnerId = stats.winner === 1 ? match.player1Id : match.player2Id
    const winnerName = stats.winner === 1 ? match.player1Name : match.player2Name
    const loserId = stats.winner === 1 ? match.player2Id : match.player1Id
    const loserName = stats.winner === 1 ? match.player2Name : match.player1Name

    // Marcar perdedor como eliminado
    const updatedParticipants = tournament.participants.map(p => {
      if (p.id === loserId) {
        return { ...p, eliminated: true }
      }
      return p
    })

    // Verificar se é a final
    if (match.round === 'final') {
      // É a final - torneio finalizado
      const finalTournament = {
        ...tournament,
        matches: updatedMatches,
        participants: updatedParticipants,
        status: 'finalizado' as const
      }

      setTournaments(tournaments.map(t => t.id === tournament.id ? finalTournament : t))
      
      if (selectedTournament && selectedTournament.id === tournament.id) {
        setSelectedTournament(finalTournament)
      }

      // Adicionar troféus aos perfis dos usuários
      const winners = getTournamentWinners(finalTournament)
      if (winners) {
        if (winners.champion) {
          addTrophyToUser(winners.champion.userId, {
            type: 'champion',
            tournament: tournament.name,
            date: new Date()
          })
          if (winners.champion.partnerId) {
            addTrophyToUser(winners.champion.partnerId, {
              type: 'champion',
              tournament: tournament.name,
              date: new Date()
            })
          }
        }
        if (winners.runnerUp) {
          addTrophyToUser(winners.runnerUp.userId, {
            type: 'runner-up',
            tournament: tournament.name,
            date: new Date()
          })
          if (winners.runnerUp.partnerId) {
            addTrophyToUser(winners.runnerUp.partnerId, {
              type: 'runner-up',
              tournament: tournament.name,
              date: new Date()
            })
          }
        }
      }
      
      toast.success(`🏆 TORNEIO FINALIZADO! Campeão: ${winnerName} | Vice-campeão: ${loserName}`)
      return
    }

    // Verificar se precisa gerar próxima fase
    const currentRoundMatches = tournament.matches.filter(m => m.round === match.round && m.phase === 'eliminatorias')
    const allCurrentRoundCompleted = currentRoundMatches.every(m => 
      m.id === match.id ? true : m.status === 'finalizada'
    )

    let newMatches: Match[] = []
    if (allCurrentRoundCompleted) {
      // Coletar todos os vencedores da rodada atual
      const winners = currentRoundMatches.map(m => {
        if (m.id === match.id) {
          return { id: winnerId, name: winnerName }
        }
        const matchStats = calcularEstatisticas(m.score!)
        return {
          id: matchStats?.winner === 1 ? m.player1Id : m.player2Id,
          name: matchStats?.winner === 1 ? m.player1Name : m.player2Name
        }
      })

      // Adicionar jogadores com bye (que não jogaram nesta rodada)
      const playersWithBye = tournament.participants.filter(p => 
        !p.eliminated && 
        !currentRoundMatches.some(m => m.player1Id === p.id || m.player2Id === p.id) &&
        !tournament.matches.some(m => 
          m.phase === 'eliminatorias' && 
          m.status === 'finalizada' && 
          m.round !== match.round &&
          (m.player1Id === p.id || m.player2Id === p.id)
        )
      )

      const allAdvancing = [...winners, ...playersWithBye.map(p => ({
        id: p.id,
        name: p.partnerName ? `${p.userName} & ${p.partnerName}` : p.userName
      }))]

      // CORREÇÃO: Verificar se restam exatamente 2 jogadores para a final
      if (allAdvancing.length === 2) {
        // Criar APENAS UMA final
        newMatches.push({
          id: `final_${Date.now()}`,
          tournamentId: tournament.id,
          player1Id: allAdvancing[0].id,
          player2Id: allAdvancing[1].id,
          player1Name: allAdvancing[0].name,
          player2Name: allAdvancing[1].name,
          phase: 'eliminatorias',
          status: 'pendente',
          round: 'final',
          scheduledDate: new Date(Date.now() + (24 * 60 * 60 * 1000))
        })
      } else if (allAdvancing.length > 2) {
        // Ainda há mais de 2 jogadores - continuar eliminatórias
        let nextRound = ''
        if (match.round === '32avos') nextRound = '16avos'
        else if (match.round === '16avos') nextRound = 'oitavas'
        else if (match.round === 'oitavas') nextRound = 'quartas'
        else if (match.round === 'quartas') nextRound = 'semifinal'

        if (nextRound) {
          const shuffledAdvancing = [...allAdvancing].sort(() => Math.random() - 0.5)
          
          for (let i = 0; i < shuffledAdvancing.length; i += 2) {
            if (shuffledAdvancing[i + 1]) {
              newMatches.push({
                id: `elimination_${Date.now()}_${i}_${nextRound}`,
                tournamentId: tournament.id,
                player1Id: shuffledAdvancing[i].id,
                player2Id: shuffledAdvancing[i + 1].id,
                player1Name: shuffledAdvancing[i].name,
                player2Name: shuffledAdvancing[i + 1].name,
                phase: 'eliminatorias',
                status: 'pendente',
                round: nextRound,
                scheduledDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000))
              })
            }
          }
        }
      }
    }

    const updatedTournament = {
      ...tournament,
      matches: [...updatedMatches, ...newMatches],
      participants: updatedParticipants
    }

    setTournaments(tournaments.map(t => t.id === tournament.id ? updatedTournament : t))
    
    if (selectedTournament && selectedTournament.id === tournament.id) {
      setSelectedTournament(updatedTournament)
    }
    
    toast.success('Resultado ITF registrado!')
    
    if (newMatches.length > 0) {
      if (newMatches[0].round === 'final') {
        toast.success('🏆 GRANDE FINAL gerada! Último confronto do torneio ITF')
      } else {
        toast.success(`Próxima fase gerada! ${newMatches.length} novos jogos criados`)
      }
    }
  }

  const handleMatchResult = () => {
    if (!selectedMatch) return

    if (selectedMatch.phase === 'eliminatorias') {
      saveEliminationMatchResult(selectedMatch, matchResult.score)
    } else {
      saveMatchResult(selectedMatch, matchResult.score)
    }
    
    setShowMatchResult(false)
    setSelectedMatch(null)
    setMatchResult({ score: '' })
  }

  const toggleUserPermission = (userId: string) => {
    if (!currentUser?.isAdmin) return

    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, canCreateTournaments: !user.canCreateTournaments }
        : user
    ))
    toast.success('Permissão atualizada!')
  }

  const deleteTournament = (tournamentId: string) => {
    if (!currentUser?.isAdmin) return
    
    setTournaments(tournaments.filter(t => t.id !== tournamentId))
    toast.success('Torneio excluído!')
  }

  const shareTournament = (shareLink: string) => {
    navigator.clipboard.writeText(shareLink)
    toast.success('Link copiado para a área de transferência!')
  }

  // Função para obter formato de set legível
  const getSetFormatDisplay = (format: string) => {
    const formats: { [key: string]: string } = {
      'melhor_3_sets': 'Melhor de 3 Sets (ITF)',
      '3_tiebreak_sets': '3 Tie-break Sets',
      '2_sets_6': '2 Sets de 6',
      '1_set_6': '1 Set de 6'
    }
    return formats[format] || format
  }

  // Função para verificar se todos os jogos da fase de grupos foram finalizados
  const areAllGroupMatchesCompleted = (tournament: Tournament) => {
    const groupMatches = tournament.matches.filter(m => m.phase === 'grupos')
    return groupMatches.length > 0 && groupMatches.every(m => m.status === 'finalizada')
  }

  // Funções para edição manual
  const handleManualEdit = (tournament: Tournament) => {
    setEditingTournament(tournament)
    setShowManualEdit(true)
  }

  const moveMatchUp = (matchId: string) => {
    if (!editingTournament) return
    
    const matches = [...editingTournament.matches]
    const matchIndex = matches.findIndex(m => m.id === matchId)
    
    if (matchIndex > 0) {
      [matches[matchIndex], matches[matchIndex - 1]] = [matches[matchIndex - 1], matches[matchIndex]]
      
      const updatedTournament = {
        ...editingTournament,
        matches
      }
      
      setEditingTournament(updatedTournament)
      setTournaments(tournaments.map(t => t.id === editingTournament.id ? updatedTournament : t))
      
      if (selectedTournament && selectedTournament.id === editingTournament.id) {
        setSelectedTournament(updatedTournament)
      }
      
      toast.success('Ordem do jogo alterada!')
    }
  }

  const moveMatchDown = (matchId: string) => {
    if (!editingTournament) return
    
    const matches = [...editingTournament.matches]
    const matchIndex = matches.findIndex(m => m.id === matchId)
    
    if (matchIndex < matches.length - 1) {
      [matches[matchIndex], matches[matchIndex + 1]] = [matches[matchIndex + 1], matches[matchIndex]]
      
      const updatedTournament = {
        ...editingTournament,
        matches
      }
      
      setEditingTournament(updatedTournament)
      setTournaments(tournaments.map(t => t.id === editingTournament.id ? updatedTournament : t))
      
      if (selectedTournament && selectedTournament.id === editingTournament.id) {
        setSelectedTournament(updatedTournament)
      }
      
      toast.success('Ordem do jogo alterada!')
    }
  }

  const resetMatchResult = (matchId: string) => {
    if (!editingTournament) return
    
    const matches = editingTournament.matches.map(m => 
      m.id === matchId ? { ...m, score: undefined, status: 'pendente' as const } : m
    )
    
    const updatedTournament = {
      ...editingTournament,
      matches
    }
    
    setEditingTournament(updatedTournament)
    setTournaments(tournaments.map(t => t.id === editingTournament.id ? updatedTournament : t))
    
    if (selectedTournament && selectedTournament.id === editingTournament.id) {
      setSelectedTournament(updatedTournament)
    }
    
    toast.success('Resultado do jogo resetado!')
  }

  // Renderização condicional baseada no login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                PORRONCA
              </CardTitle>
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800 -mt-1">
                TORNEIOS ITF
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2 text-sm sm:text-base">
                Beach Tennis seguindo regras ITF 2025 + SUPER 8
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Dialog open={showLogin} onOpenChange={setShowLogin}>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg h-12 text-base sm:text-lg font-semibold">
                  <LogIn className="w-5 h-5 mr-2" />
                  Entrar
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Entrar no PORRONCA TORNEIOS ITF</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Digite suas credenciais para acessar
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      placeholder="seu@email.com"
                      className="text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-sm">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="text-base"
                    />
                  </div>
                  <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base">
                    Entrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showRegister} onOpenChange={setShowRegister}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-2 hover:bg-gray-50 h-12 text-base sm:text-lg font-semibold">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Criar Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Criar conta no PORRONCA TORNEIOS ITF</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Preencha os dados para se cadastrar
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">Nome completo</Label>
                    <Input
                      id="name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                      placeholder="Seu nome"
                      className="text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email" className="text-sm">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      placeholder="seu@email.com"
                      className="text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password" className="text-sm">Senha</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="text-base"
                    />
                  </div>
                  <Button onClick={handleRegister} className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base">
                    Criar Conta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </CardContent>
        </Card>
      </div>
    )
  }

  // Interface principal do app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  PORRONCA
                </h1>
                <p className="text-xs text-gray-500 -mt-1">TORNEIOS ITF + SUPER 8</p>
              </div>
            </div>
            
            {/* Botão Seja Organizador */}
            <div className="hidden sm:flex items-center space-x-4">
              <Button
                onClick={handleWhatsAppClick}
                className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg transition-all duration-300 hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Seja Organizador
              </Button>
            </div>
            
            {/* Desktop User Info */}
            <div className="hidden sm:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{currentUser.name}</span>
                  <span 
                    className="text-xs text-gray-500 flex items-center cursor-pointer hover:text-orange-600 transition-colors"
                    onClick={() => copyUserId(currentUser.userId)}
                    title="Clique para copiar ID"
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    ID: {currentUser.userId}
                    <Copy className="w-3 h-3 ml-1" />
                  </span>
                </div>
                {currentUser.isAdmin && (
                  <Badge variant="secondary" className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin ITF
                  </Badge>
                )}
                {currentUser.canCreateTournaments && !currentUser.isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Organizador
                  </Badge>
                )}
              </div>
              <Dialog open={showProfile} onOpenChange={setShowProfile}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sair
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile User Info */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t bg-white py-4 space-y-4">
              {/* Botão Seja Organizador Mobile */}
              <Button
                onClick={handleWhatsAppClick}
                className="w-full bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Seja Organizador
              </Button>
              
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{currentUser.name}</p>
                  <p 
                    className="text-sm text-gray-500 flex items-center cursor-pointer hover:text-orange-600 transition-colors"
                    onClick={() => copyUserId(currentUser.userId)}
                    title="Clique para copiar ID"
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    ID: {currentUser.userId}
                    <Copy className="w-3 h-3 ml-1" />
                  </p>
                  <div className="flex space-x-2 mt-1">
                    {currentUser.isAdmin && (
                      <Badge variant="secondary" className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin ITF
                      </Badge>
                    )}
                    {currentUser.canCreateTournaments && !currentUser.isAdmin && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Organizador
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Mobile Navigation */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('home')
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === 'home'
                      ? 'bg-orange-100 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Home className="w-4 h-4 inline mr-2" />
                  Início
                </button>
                <button
                  onClick={() => {
                    setActiveTab('tournaments')
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === 'tournaments'
                      ? 'bg-orange-100 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Trophy className="w-4 h-4 inline mr-2" />
                  Torneios ITF + SUPER 8
                </button>
                <button
                  onClick={() => {
                    setShowAllTournaments(true)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <List className="w-4 h-4 inline mr-2" />
                  Todos os Torneios
                </button>
                <button
                  onClick={() => {
                    setShowProfile(true)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Perfil
                </button>
                {currentUser.isAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab('admin')
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === 'admin'
                        ? 'bg-orange-100 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Admin
                  </button>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="w-full"
              >
                Sair
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden sm:block bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('home')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'home'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Home className="w-4 h-4 inline mr-2" />
              Início
            </button>
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tournaments'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Torneios ITF + SUPER 8
            </button>
            <button
              onClick={() => setShowAllTournaments(true)}
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm transition-colors text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <List className="w-4 h-4 inline mr-2" />
              Todos os Torneios
            </button>
            <button
              onClick={() => setShowProfile(true)}
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm transition-colors text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <User className="w-4 h-4 inline mr-2" />
              Perfil
            </button>
            {currentUser.isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'admin'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Admin
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Dialog "Todos os Torneios" */}
      <Dialog open={showAllTournaments} onOpenChange={setShowAllTournaments}>
        <DialogContent className="w-[95vw] max-w-6xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center">
              <List className="w-5 h-5 mr-2" />
              Todos os Torneios
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Visualize todos os torneios com destaque para campeões e vice-campeões
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={tournamentFilter === 'todos' ? 'default' : 'outline'}
                onClick={() => setTournamentFilter('todos')}
                className="text-xs"
              >
                <Filter className="w-3 h-3 mr-1" />
                Todos ({tournaments.length})
              </Button>
              <Button
                size="sm"
                variant={tournamentFilter === 'finalizados' ? 'default' : 'outline'}
                onClick={() => setTournamentFilter('finalizados')}
                className="text-xs"
              >
                <Trophy className="w-3 h-3 mr-1" />
                Finalizados ({tournaments.filter(t => t.status === 'finalizado').length})
              </Button>
              <Button
                size="sm"
                variant={tournamentFilter === 'andamento' ? 'default' : 'outline'}
                onClick={() => setTournamentFilter('andamento')}
                className="text-xs"
              >
                <Activity className="w-3 h-3 mr-1" />
                Em Andamento ({tournaments.filter(t => t.status === 'andamento').length})
              </Button>
              <Button
                size="sm"
                variant={tournamentFilter === 'abertos' ? 'default' : 'outline'}
                onClick={() => setTournamentFilter('abertos')}
                className="text-xs"
              >
                <Users className="w-3 h-3 mr-1" />
                Abertos ({tournaments.filter(t => t.status === 'criado').length})
              </Button>
            </div>

            {/* Lista de Torneios */}
            <div className="space-y-4">
              {getFilteredTournaments().map((tournament) => {
                const winners = getTournamentWinners(tournament)
                
                return (
                  <Card key={tournament.id} className="p-4 border-l-4 border-orange-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900">{tournament.name}</h3>
                          {tournament.type === 'super8' && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              SUPER 8
                            </Badge>
                          )}
                          <Badge
                            variant={
                              tournament.status === 'andamento' ? 'default' :
                              tournament.status === 'finalizado' ? 'secondary' : 'outline'
                            }
                            className={`text-xs ${
                              tournament.status === 'andamento' ? 'bg-green-500' :
                              tournament.status === 'finalizado' ? 'bg-purple-500' : 'border-orange-500 text-orange-600'
                            }`}
                          >
                            {tournament.status === 'criado' ? 'Aberto' :
                             tournament.status === 'andamento' ? 'Em andamento' : 'Finalizado'}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            {tournament.participants.length} participantes
                          </span>
                          <span className="capitalize">{tournament.category}</span>
                          <span className="capitalize">{tournament.gender}</span>
                          <span>{tournament.location || 'Local não definido'}</span>
                          <span>{tournament.createdAt.toLocaleDateString()}</span>
                        </div>

                        {tournament.prize && (
                          <p className="text-xs sm:text-sm text-green-600 font-semibold mb-2">
                            🏆 {tournament.prize}
                          </p>
                        )}

                        {/* Destaque para Campeão e Vice-Campeão */}
                        {tournament.status === 'finalizado' && winners && (
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200 mt-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                              {winners.champion && (
                                <div className="flex items-center space-x-2">
                                  <Crown className="w-5 h-5 text-yellow-600" />
                                  <div>
                                    <p className="text-sm font-bold text-yellow-800">CAMPEÃO</p>
                                    <p className="text-xs text-yellow-700">{winners.champion.name}</p>
                                  </div>
                                </div>
                              )}
                              {winners.runnerUp && (
                                <div className="flex items-center space-x-2">
                                  <Medal className="w-5 h-5 text-gray-600" />
                                  <div>
                                    <p className="text-sm font-bold text-gray-800">VICE-CAMPEÃO</p>
                                    <p className="text-xs text-gray-700">{winners.runnerUp.name}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTournament(tournament)
                            setActiveTab('tournaments')
                            setShowAllTournaments(false)
                          }}
                          className="text-xs"
                        >
                          Ver Detalhes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => shareTournament(tournament.shareLink)}
                          className="text-xs"
                        >
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
              
              {getFilteredTournaments().length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">Nenhum torneio encontrado</p>
                  <p className="text-xs">Ajuste os filtros ou crie um novo torneio</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog do Perfil */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center">
              <User className="w-5 h-5 mr-2" />
              Meu Perfil
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Gerencie suas informações pessoais e veja seu histórico de torneios
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="trophies">Troféus</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xl">
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{currentUser.name}</h3>
                  <p className="text-sm text-gray-600">{currentUser.email}</p>
                  <p 
                    className="text-xs text-gray-500 flex items-center mt-1 cursor-pointer hover:text-orange-600 transition-colors"
                    onClick={() => copyUserId(currentUser.userId)}
                    title="Clique para copiar ID"
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    ID: {currentUser.userId}
                    <Copy className="w-3 h-3 ml-1" />
                  </p>
                  <div className="flex space-x-2 mt-2">
                    {currentUser.isAdmin && (
                      <Badge variant="secondary" className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin ITF
                      </Badge>
                    )}
                    {currentUser.canCreateTournaments && !currentUser.isAdmin && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Organizador
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="profile-name" className="text-sm">Alterar Nome</Label>
                  <Input
                    id="profile-name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    placeholder={currentUser.name}
                    className="text-base"
                  />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="current-password" className="text-sm">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm({...profileForm, currentPassword: e.target.value})}
                      placeholder="Digite sua senha atual"
                      className="text-base pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-password" className="text-sm">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                      placeholder="Digite a nova senha"
                      className="text-base pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-sm">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                      placeholder="Confirme a nova senha"
                      className="text-base pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleUpdateProfile} 
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base"
                  disabled={!profileForm.name && !profileForm.newPassword}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Atualizar Perfil
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="trophies" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-bold">Meus Troféus</h3>
              </div>
              
              <div className="space-y-3">
                {currentUser.trophies && currentUser.trophies.length > 0 ? (
                  currentUser.trophies.map((trophy, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                      <div className="flex items-center space-x-3">
                        {trophy.type === 'champion' ? (
                          <Crown className="w-8 h-8 text-yellow-600" />
                        ) : (
                          <Medal className="w-8 h-8 text-gray-600" />
                        )}
                        <div>
                          <p className="font-bold text-sm">
                            {trophy.type === 'champion' ? '🏆 CAMPEÃO' : '🥈 VICE-CAMPEÃO'}
                          </p>
                          <p className="text-xs text-gray-700">{trophy.tournament}</p>
                          <p className="text-xs text-gray-500">{trophy.date.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">Nenhum troféu conquistado ainda</p>
                    <p className="text-xs">Participe de torneios para conquistar seus primeiros troféus!</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <History className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-bold">Histórico de Torneios</h3>
              </div>
              
              <div className="space-y-3">
                {getUserTournamentHistory().map(({ tournament, participant, position }) => (
                  <div key={tournament.id} className="p-4 border rounded-lg bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-sm">{tournament.name}</h4>
                        {tournament.type === 'super8' && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            SUPER 8
                          </Badge>
                        )}
                      </div>
                      <Badge variant={
                        tournament.status === 'andamento' ? 'default' :
                        tournament.status === 'finalizado' ? 'secondary' : 'outline'
                      } className={`text-xs ${
                        tournament.status === 'andamento' ? 'bg-green-500' :
                        tournament.status === 'finalizado' ? 'bg-purple-500' : 'border-orange-500 text-orange-600'
                      }`}>
                        {tournament.status === 'criado' ? 'Aberto' :
                         tournament.status === 'andamento' ? 'Em andamento' : 'Finalizado'}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Categoria:</strong> {tournament.category} • <strong>Gênero:</strong> {tournament.gender}</p>
                      <p><strong>Local:</strong> {tournament.location || 'Não definido'}</p>
                      {participant?.partnerName && (
                        <p><strong>Parceiro:</strong> {participant.partnerName}</p>
                      )}
                      <p><strong>Classificação:</strong> {position}</p>
                      {tournament.type === 'super8' && participant?.gamesBalance !== undefined && (
                        <p><strong>Saldo de Games:</strong> {participant.gamesBalance > 0 ? '+' : ''}{participant.gamesBalance}</p>
                      )}
                      {tournament.type !== 'super8' && participant && (
                        <p><strong>Estatísticas:</strong> {participant.wins || 0}V - {participant.losses || 0}D - Sets: {participant.setsWon || 0}/{participant.setsLost || 0}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {getUserTournamentHistory().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">Nenhum torneio encontrado</p>
                    <p className="text-xs">Participe de torneios para ver seu histórico aqui</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Welcome Banner */}
            <Card className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white border-0 shadow-2xl">
              <CardContent className="p-4 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-3xl font-bold mb-2">Bem-vindo ao PORRONCA TORNEIOS ITF + SUPER 8!</h2>
                    <p className="text-orange-100 text-sm sm:text-lg">
                      Beach Tennis seguindo regras oficiais ITF 2025 + Nova modalidade SUPER 8
                    </p>
                    <p className="text-orange-200 mt-2 text-xs sm:text-base">
                      🏐 Validação automática de placares • Algoritmo ITF de grupos • SUPER 8 individual com duplas rotativas
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <Sparkles className="w-16 h-16 sm:w-24 sm:h-24 text-orange-200" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs sm:text-sm font-medium">Torneios</p>
                      <p className="text-xl sm:text-3xl font-bold">{tournaments.length}</p>
                    </div>
                    <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs sm:text-sm font-medium">Em Andamento</p>
                      <p className="text-xl sm:text-3xl font-bold">
                        {tournaments.filter(t => t.status === 'andamento').length}
                      </p>
                    </div>
                    <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 shadow-lg">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs sm:text-sm font-medium">SUPER 8</p>
                      <p className="text-xl sm:text-3xl font-bold">
                        {tournaments.filter(t => t.type === 'super8').length}
                      </p>
                    </div>
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-xs sm:text-sm font-medium">Participantes</p>
                      <p className="text-xl sm:text-3xl font-bold">
                        {tournaments.reduce((acc, t) => acc + t.participants.length, 0)}
                      </p>
                    </div>
                    <Users2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SUPER 8 Info */}
            <Card className="shadow-lg border-l-4 border-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" />
                  Nova Modalidade: SUPER 8
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Torneio individual com duplas rotativas - Todos jogam com todos!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-semibold text-purple-900 text-sm sm:text-base">5-12 Jogadores</h3>
                    <p className="text-xs sm:text-sm text-purple-700">Cada atleta entra sozinho, duplas são formadas automaticamente</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-pink-50 rounded-lg">
                    <Shuffle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-pink-600" />
                    <h3 className="font-semibold text-pink-900 text-sm sm:text-base">Duplas Rotativas</h3>
                    <p className="text-xs sm:text-sm text-pink-700">Sistema gera duplas diferentes a cada rodada</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-orange-600" />
                    <h3 className="font-semibold text-orange-900 text-sm sm:text-base">Saldo de Games</h3>
                    <p className="text-xs sm:text-sm text-orange-700">Classificação por saldo de games individuais</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600" />
                  Ações Rápidas
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Acesse rapidamente as principais funcionalidades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {currentUser.canCreateTournaments && (
                    <Dialog open={showCreateTournament} onOpenChange={setShowCreateTournament}>
                      <DialogTrigger asChild>
                        <Button className="h-auto p-4 sm:p-6 flex flex-col items-center space-y-2 sm:space-y-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg text-xs sm:text-sm">
                          <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
                          <span className="font-semibold">Criar Torneio</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Criar Novo Torneio</DialogTitle>
                          <DialogDescription className="text-sm sm:text-base">
                            Escolha entre ITF tradicional, duplas ou SUPER 8
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="tournament-name" className="text-sm">Nome do Torneio</Label>
                            <Input
                              id="tournament-name"
                              value={tournamentForm.name}
                              onChange={(e) => setTournamentForm({...tournamentForm, name: e.target.value})}
                              placeholder="Ex: Copa Beach Tennis ITF 2024"
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="tournament-description" className="text-sm">Descrição</Label>
                            <Textarea
                              id="tournament-description"
                              value={tournamentForm.description}
                              onChange={(e) => setTournamentForm({...tournamentForm, description: e.target.value})}
                              placeholder="Descreva o torneio..."
                              rows={3}
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="tournament-type" className="text-sm">Modalidade</Label>
                            <Select
                              value={tournamentForm.type}
                              onValueChange={(value: any) => {
                                setTournamentForm({
                                  ...tournamentForm, 
                                  type: value,
                                  maxParticipants: value === 'super8' ? 8 : 16
                                })
                              }}
                            >
                              <SelectTrigger className="text-base">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="duplas">Duplas</SelectItem>
                                <SelectItem value="super8">
                                  <div className="flex items-center">
                                    <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                    SUPER 8 (Novo!)
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {tournamentForm.type === 'super8' && (
                              <p className="text-xs text-purple-600 mt-1">
                                Torneio individual com duplas rotativas (5-12 jogadores)
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="tournament-category" className="text-sm">Categoria</Label>
                              <Select
                                value={tournamentForm.category}
                                onValueChange={(value: any) => setTournamentForm({...tournamentForm, category: value})}
                              >
                                <SelectTrigger className="text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="iniciante">Iniciante</SelectItem>
                                  <SelectItem value="intermediario">Intermediário</SelectItem>
                                  <SelectItem value="avancado">Avançado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="tournament-gender" className="text-sm">Gênero</Label>
                              <Select
                                value={tournamentForm.gender}
                                onValueChange={(value: any) => setTournamentForm({...tournamentForm, gender: value})}
                              >
                                <SelectTrigger className="text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="masculino">Masculino</SelectItem>
                                  <SelectItem value="feminino">Feminino</SelectItem>
                                  <SelectItem value="misto">Misto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="max-participants" className="text-sm">
                              Máx. {tournamentForm.type === 'duplas' ? 'Duplas' : 'Participantes'}
                              {tournamentForm.type === 'super8' && ' (5-12)'}
                            </Label>
                            <Input
                              id="max-participants"
                              type="number"
                              value={tournamentForm.maxParticipants}
                              onChange={(e) => setTournamentForm({...tournamentForm, maxParticipants: parseInt(e.target.value)})}
                              placeholder={tournamentForm.type === 'super8' ? '8' : '16'}
                              min={tournamentForm.type === 'super8' ? 5 : 3}
                              max={tournamentForm.type === 'super8' ? 12 : 64}
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="tournament-location" className="text-sm">Local</Label>
                            <Input
                              id="tournament-location"
                              value={tournamentForm.location}
                              onChange={(e) => setTournamentForm({...tournamentForm, location: e.target.value})}
                              placeholder="Ex: Arena Beach Tennis"
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="prize" className="text-sm">Premiação</Label>
                            <Input
                              id="prize"
                              value={tournamentForm.prize}
                              onChange={(e) => setTournamentForm({...tournamentForm, prize: e.target.value})}
                              placeholder="Ex: R$ 2.000"
                              className="text-base"
                            />
                          </div>
                          <Button onClick={handleCreateTournament} className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base">
                            Criar Torneio {tournamentForm.type === 'super8' ? 'SUPER 8' : 'ITF'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button
                    variant="outline"
                    className="h-auto p-4 sm:p-6 flex flex-col items-center space-y-2 sm:space-y-3 border-2 hover:bg-orange-50 hover:border-orange-300 shadow-lg text-xs sm:text-sm"
                    onClick={() => setActiveTab('tournaments')}
                  >
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                    <span className="font-semibold">Ver Torneios</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 sm:p-6 flex flex-col items-center space-y-2 sm:space-y-3 border-2 hover:bg-purple-50 hover:border-purple-300 shadow-lg text-xs sm:text-sm"
                    onClick={() => setActiveTab('tournaments')}
                  >
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                    <span className="font-semibold">SUPER 8</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 sm:p-6 flex flex-col items-center space-y-2 sm:space-y-3 border-2 hover:bg-blue-50 hover:border-blue-300 shadow-lg text-xs sm:text-sm"
                    onClick={() => setShowAllTournaments(true)}
                  >
                    <List className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    <span className="font-semibold">Todos os Torneios</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Tournaments */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center text-lg sm:text-xl">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-orange-600" />
                    Torneios em Destaque
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('tournaments')}
                    className="text-orange-600 hover:text-orange-700 text-xs sm:text-sm"
                  >
                    Ver todos
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tournaments.slice(0, 3).map((tournament) => {
                    const winners = getTournamentWinners(tournament)
                    
                    return (
                      <div
                        key={tournament.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border rounded-xl hover:bg-orange-50 hover:border-orange-200 transition-all cursor-pointer shadow-sm space-y-3 sm:space-y-0"
                        onClick={() => {
                          setSelectedTournament(tournament)
                          setActiveTab('tournaments')
                        }}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                            tournament.type === 'super8' 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600' 
                              : 'bg-gradient-to-r from-orange-500 to-red-600'
                          }`}>
                            {tournament.type === 'super8' ? (
                              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            ) : (
                              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-gray-900 text-base sm:text-lg">{tournament.name}</h3>
                              {tournament.type === 'super8' && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                                  SUPER 8
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mt-1">
                              <span className="flex items-center">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                {tournament.participants.length}/{tournament.maxParticipants || 16}
                              </span>
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                {tournament.location || 'Local não definido'}
                              </span>
                              <span className="capitalize font-medium text-orange-600">
                                {tournament.category}
                              </span>
                              <span className="capitalize font-medium text-purple-600">
                                {tournament.gender}
                              </span>
                            </div>
                            {tournament.prize && (
                              <p className="text-xs sm:text-sm text-green-600 font-semibold mt-1">
                                🏆 {tournament.prize}
                              </p>
                            )}
                            
                            {/* Destaque para Campeão e Vice-Campeão nos cards */}
                            {tournament.status === 'finalizado' && winners && (
                              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-2 rounded-lg border border-yellow-200 mt-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                                  {winners.champion && (
                                    <div className="flex items-center space-x-1">
                                      <Crown className="w-4 h-4 text-yellow-600" />
                                      <div>
                                        <p className="text-xs font-bold text-yellow-800">CAMPEÃO</p>
                                        <p className="text-xs text-yellow-700">{winners.champion.name}</p>
                                      </div>
                                    </div>
                                  )}
                                  {winners.runnerUp && (
                                    <div className="flex items-center space-x-1">
                                      <Medal className="w-4 h-4 text-gray-600" />
                                      <div>
                                        <p className="text-xs font-bold text-gray-800">VICE</p>
                                        <p className="text-xs text-gray-700">{winners.runnerUp.name}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge
                            variant={
                              tournament.status === 'andamento' ? 'default' :
                              tournament.status === 'finalizado' ? 'secondary' : 'outline'
                            }
                            className={
                              tournament.status === 'andamento' ? 'bg-green-500' :
                              tournament.status === 'finalizado' ? 'bg-purple-500' : 'border-orange-500 text-orange-600'
                            }
                          >
                            {tournament.status === 'criado' ? 'Aberto' :
                             tournament.status === 'andamento' ? 'Em andamento' : 'Finalizado'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {tournaments.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Nenhum torneio encontrado</h3>
                      <p className="text-gray-500 mb-6 text-sm sm:text-base">Seja o primeiro a criar um torneio ITF ou SUPER 8!</p>
                      {currentUser.canCreateTournaments && (
                        <Button
                          onClick={() => setShowCreateTournament(true)}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-sm sm:text-base"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeiro Torneio
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="space-y-6">
            {!selectedTournament ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Torneios ITF + SUPER 8</h2>
                  {currentUser.canCreateTournaments && (
                    <Dialog open={showCreateTournament} onOpenChange={setShowCreateTournament}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg text-sm sm:text-base">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Torneio
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Criar Novo Torneio</DialogTitle>
                          <DialogDescription className="text-sm sm:text-base">
                            Escolha entre ITF tradicional, duplas ou SUPER 8
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="tournament-name" className="text-sm">Nome do Torneio</Label>
                            <Input
                              id="tournament-name"
                              value={tournamentForm.name}
                              onChange={(e) => setTournamentForm({...tournamentForm, name: e.target.value})}
                              placeholder="Ex: Copa Beach Tennis ITF 2024"
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="tournament-description" className="text-sm">Descrição</Label>
                            <Textarea
                              id="tournament-description"
                              value={tournamentForm.description}
                              onChange={(e) => setTournamentForm({...tournamentForm, description: e.target.value})}
                              placeholder="Descreva o torneio..."
                              rows={3}
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="tournament-type" className="text-sm">Modalidade</Label>
                            <Select
                              value={tournamentForm.type}
                              onValueChange={(value: any) => {
                                setTournamentForm({
                                  ...tournamentForm, 
                                  type: value,
                                  maxParticipants: value === 'super8' ? 8 : 16
                                })
                              }}
                            >
                              <SelectTrigger className="text-base">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="duplas">Duplas</SelectItem>
                                <SelectItem value="super8">
                                  <div className="flex items-center">
                                    <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                    SUPER 8 (Novo!)
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {tournamentForm.type === 'super8' && (
                              <p className="text-xs text-purple-600 mt-1">
                                Torneio individual com duplas rotativas (5-12 jogadores)
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="tournament-category" className="text-sm">Categoria</Label>
                              <Select
                                value={tournamentForm.category}
                                onValueChange={(value: any) => setTournamentForm({...tournamentForm, category: value})}
                              >
                                <SelectTrigger className="text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="iniciante">Iniciante</SelectItem>
                                  <SelectItem value="intermediario">Intermediário</SelectItem>
                                  <SelectItem value="avancado">Avançado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="tournament-gender" className="text-sm">Gênero</Label>
                              <Select
                                value={tournamentForm.gender}
                                onValueChange={(value: any) => setTournamentForm({...tournamentForm, gender: value})}
                              >
                                <SelectTrigger className="text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="masculino">Masculino</SelectItem>
                                  <SelectItem value="feminino">Feminino</SelectItem>
                                  <SelectItem value="misto">Misto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="max-participants" className="text-sm">
                              Máx. {tournamentForm.type === 'duplas' ? 'Duplas' : 'Participantes'}
                              {tournamentForm.type === 'super8' && ' (5-12)'}
                            </Label>
                            <Input
                              id="max-participants"
                              type="number"
                              value={tournamentForm.maxParticipants}
                              onChange={(e) => setTournamentForm({...tournamentForm, maxParticipants: parseInt(e.target.value)})}
                              placeholder={tournamentForm.type === 'super8' ? '8' : '16'}
                              min={tournamentForm.type === 'super8' ? 5 : 3}
                              max={tournamentForm.type === 'super8' ? 12 : 64}
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="tournament-location" className="text-sm">Local</Label>
                            <Input
                              id="tournament-location"
                              value={tournamentForm.location}
                              onChange={(e) => setTournamentForm({...tournamentForm, location: e.target.value})}
                              placeholder="Ex: Arena Beach Tennis"
                              className="text-base"
                            />
                          </div>
                          <div>
                            <Label htmlFor="prize" className="text-sm">Premiação</Label>
                            <Input
                              id="prize"
                              value={tournamentForm.prize}
                              onChange={(e) => setTournamentForm({...tournamentForm, prize: e.target.value})}
                              placeholder="Ex: R$ 2.000"
                              className="text-base"
                            />
                          </div>
                          <Button onClick={handleCreateTournament} className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base">
                            Criar Torneio {tournamentForm.type === 'super8' ? 'SUPER 8' : 'ITF'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {tournaments.map((tournament) => (
                    <Card key={tournament.id} className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <CardTitle className="text-base sm:text-lg font-bold text-gray-900">{tournament.name}</CardTitle>
                              {tournament.type === 'super8' && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  SUPER 8
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-gray-600 text-sm">
                              {tournament.description}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              tournament.status === 'andamento' ? 'default' :
                              tournament.status === 'finalizado' ? 'secondary' : 'outline'
                            }
                            className={
                              tournament.status === 'andamento' ? 'bg-green-500' :
                              tournament.status === 'finalizado' ? 'bg-purple-500' : 'border-orange-500 text-orange-600'
                            }
                          >
                            {tournament.status === 'criado' ? 'Aberto' :
                             tournament.status === 'andamento' ? 'Em andamento' : 'Finalizado'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-orange-500" />
                            <span className="capitalize font-medium">{tournament.category}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-pink-500" />
                            <span className="capitalize font-medium">{tournament.gender}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {tournament.type === 'super8' ? (
                              <Sparkles className="w-4 h-4 text-purple-500" />
                            ) : (
                              <Users className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="capitalize font-medium">
                              {tournament.type === 'super8' ? 'SUPER 8' : tournament.type}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users2 className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{tournament.participants.length}/{tournament.maxParticipants || 16}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{tournament.location || 'Local não definido'}</span>
                        </div>
                        
                        {tournament.prize && (
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
                            <p className="text-sm font-semibold text-orange-700 flex items-center">
                              <Medal className="w-4 h-4 mr-2" />
                              {tournament.prize}
                            </p>
                          </div>
                        )}

                        <Separator />
                        
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-xs sm:text-sm"
                            onClick={() => setSelectedTournament(tournament)}
                          >
                            Ver Detalhes
                          </Button>
                          <div className="flex space-x-2">
                            {tournament.status === 'criado' && (
                              <Dialog open={showJoinTournament} onOpenChange={setShowJoinTournament}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`flex-1 text-xs sm:text-sm ${
                                      tournament.type === 'super8' 
                                        ? 'border-purple-500 text-purple-600 hover:bg-purple-50' 
                                        : 'border-orange-500 text-orange-600 hover:bg-orange-50'
                                    }`}
                                    onClick={() => setSelectedTournament(tournament)}
                                    disabled={tournament.participants.some(p => p.userId === currentUser.id) || tournament.participants.length >= (tournament.maxParticipants || 16)}
                                  >
                                    {tournament.participants.some(p => p.userId === currentUser.id) ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Inscrito
                                      </>
                                    ) : tournament.participants.length >= (tournament.maxParticipants || 16) ? (
                                      <>
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Lotado
                                      </>
                                    ) : (
                                      <>
                                        {tournament.type === 'super8' ? (
                                          <Sparkles className="w-4 h-4 mr-1" />
                                        ) : (
                                          <UserPlus className="w-4 h-4 mr-1" />
                                        )}
                                        {tournament.type === 'super8' ? 'Entrar no SUPER 8' : 'Participar'}
                                      </>
                                    )}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[95vw] max-w-md mx-auto">
                                  <DialogHeader>
                                    <DialogTitle className="text-lg sm:text-xl">
                                      Inscrever-se no Torneio {tournament.type === 'super8' ? 'SUPER 8' : 'ITF'}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm sm:text-base">
                                      {tournament.type === 'duplas' 
                                        ? 'Para torneios de dupla, você precisa fornecer o ID do seu parceiro'
                                        : tournament.type === 'super8'
                                        ? 'No SUPER 8, você entra sozinho e as duplas são formadas automaticamente'
                                        : 'Confirme sua inscrição no torneio individual'
                                      }
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-sm text-gray-600 mb-2">
                                        <strong>Torneio:</strong> {tournament.name}
                                      </p>
                                      <p className="text-sm text-gray-600 mb-2">
                                        <strong>Modalidade:</strong> {
                                          tournament.type === 'duplas' ? 'Duplas' : 
                                          tournament.type === 'super8' ? 'SUPER 8 (Individual com duplas rotativas)' : 
                                          'Individual'
                                        }
                                      </p>
                                      <p className="text-sm text-gray-600 mb-4">
                                        <strong>Gênero:</strong> {tournament.gender}
                                      </p>
                                    </div>
                                    
                                    {tournament.type === 'duplas' && (
                                      <div>
                                        <Label htmlFor="partner-id" className="text-sm">ID do Parceiro</Label>
                                        <Input
                                          id="partner-id"
                                          value={partnerUserId}
                                          onChange={(e) => setPartnerUserId(e.target.value.toUpperCase())}
                                          placeholder="Ex: ABC123XY"
                                          className="uppercase text-base"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                          Peça o ID único do seu parceiro (encontrado no perfil dele)
                                        </p>
                                      </div>
                                    )}

                                    {tournament.type === 'super8' && (
                                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                        <div className="flex items-center mb-2">
                                          <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                          <p className="text-sm font-semibold text-purple-700">Como funciona o SUPER 8:</p>
                                        </div>
                                        <ul className="text-xs text-purple-600 space-y-1">
                                          <li>• Você entra sozinho no torneio</li>
                                          <li>• Sistema forma duplas diferentes a cada rodada</li>
                                          <li>• Todos jogam com todos ao longo do torneio</li>
                                          <li>• Classificação individual por saldo de games</li>
                                        </ul>
                                      </div>
                                    )}
                                    
                                    <Button 
                                      onClick={() => {
                                        if (selectedTournament) {
                                          handleJoinTournament(selectedTournament.id)
                                          setShowJoinTournament(false)
                                        }
                                      }} 
                                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base"
                                    >
                                      Confirmar Inscrição
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => shareTournament(tournament.shareLink)}
                              className="hover:bg-orange-50"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {tournaments.length === 0 && (
                  <Card className="shadow-lg">
                    <CardContent className="text-center py-16">
                      <Trophy className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 text-gray-300" />
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Nenhum torneio encontrado</h3>
                      <p className="text-gray-500 mb-8 text-base sm:text-lg">Crie seu primeiro torneio ITF ou SUPER 8!</p>
                      {currentUser.canCreateTournaments && (
                        <Button
                          onClick={() => setShowCreateTournament(true)}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-base sm:text-lg px-6 sm:px-8 py-3"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Criar Primeiro Torneio
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTournament(null)}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                    Voltar aos Torneios
                  </Button>
                </div>

                <Card className="shadow-lg">
                  <CardHeader className={`text-white ${
                    selectedTournament.type === 'super8' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600' 
                      : 'bg-gradient-to-r from-orange-500 to-red-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-3">
                          <CardTitle className="text-xl sm:text-2xl font-bold">{selectedTournament.name}</CardTitle>
                          {selectedTournament.type === 'super8' && (
                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                              <Sparkles className="w-4 h-4 mr-1" />
                              SUPER 8
                            </Badge>
                          )}
                        </div>
                        <CardDescription className={`mt-2 ${
                          selectedTournament.type === 'super8' ? 'text-purple-100' : 'text-orange-100'
                        }`}>
                          {selectedTournament.description}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-white/20 text-white border-white/30"
                      >
                        {selectedTournament.status === 'criado' ? 'Aberto' :
                         selectedTournament.status === 'andamento' ? 'Em andamento' : 'Finalizado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTournament.participants.length}/{selectedTournament.maxParticipants || 16}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedTournament.type === 'duplas' ? 'Duplas' : 
                           selectedTournament.type === 'super8' ? 'Jogadores' : 'Participantes'}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Target className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                        <p className="text-sm font-medium text-gray-900 capitalize">{selectedTournament.category}</p>
                        <p className="text-xs text-gray-500">Categoria</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <User className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                        <p className="text-sm font-medium text-gray-900 capitalize">{selectedTournament.gender}</p>
                        <p className="text-xs text-gray-500">Gênero</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="text-sm font-medium text-gray-900">{selectedTournament.location || 'Não definido'}</p>
                        <p className="text-xs text-gray-500">Local</p>
                      </div>
                    </div>

                    {selectedTournament.prize && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200 mb-6">
                        <div className="flex items-center">
                          <Medal className="w-6 h-6 mr-3 text-orange-600" />
                          <div>
                            <p className="font-semibold text-orange-900">Premiação</p>
                            <p className="text-orange-700">{selectedTournament.prize}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 mb-6">
                      {selectedTournament.status === 'criado' && (
                        <>
                          {selectedTournament.type === 'super8' ? (
                            <Button
                              onClick={() => generateSuper8Tournament(selectedTournament.id)}
                              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                              disabled={selectedTournament.participants.length < 5}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Iniciar SUPER 8
                            </Button>
                          ) : (
                            <Button
                              onClick={() => generateGroups(selectedTournament.id)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                              disabled={selectedTournament.participants.length < 3}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Gerar Grupos ITF
                            </Button>
                          )}
                          
                          {/* Botão de inscrição nos detalhes para torneios abertos */}
                          {!selectedTournament.participants.some(p => p.userId === currentUser.id) && 
                           selectedTournament.participants.length < (selectedTournament.maxParticipants || 16) && (
                            <Dialog open={showJoinTournament} onOpenChange={setShowJoinTournament}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`${
                                    selectedTournament.type === 'super8' 
                                      ? 'border-purple-500 text-purple-600 hover:bg-purple-50' 
                                      : 'border-orange-500 text-orange-600 hover:bg-orange-50'
                                  }`}
                                  onClick={() => setSelectedTournament(selectedTournament)}
                                >
                                  {selectedTournament.type === 'super8' ? (
                                    <>
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Entrar no SUPER 8
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-4 h-4 mr-2" />
                                      Participar
                                    </>
                                  )}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95vw] max-w-md mx-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-lg sm:text-xl">
                                    Inscrever-se no Torneio {selectedTournament.type === 'super8' ? 'SUPER 8' : 'ITF'}
                                  </DialogTitle>
                                  <DialogDescription className="text-sm sm:text-base">
                                    {selectedTournament.type === 'duplas' 
                                      ? 'Para torneios de dupla, você precisa fornecer o ID do seu parceiro'
                                      : selectedTournament.type === 'super8'
                                      ? 'No SUPER 8, você entra sozinho e as duplas são formadas automaticamente'
                                      : 'Confirme sua inscrição no torneio individual'
                                    }
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-sm text-gray-600 mb-2">
                                      <strong>Torneio:</strong> {selectedTournament.name}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-2">
                                      <strong>Modalidade:</strong> {
                                        selectedTournament.type === 'duplas' ? 'Duplas' : 
                                        selectedTournament.type === 'super8' ? 'SUPER 8 (Individual com duplas rotativas)' : 
                                        'Individual'
                                      }
                                    </p>
                                    <p className="text-sm text-gray-600 mb-4">
                                      <strong>Gênero:</strong> {selectedTournament.gender}
                                    </p>
                                  </div>
                                  
                                  {selectedTournament.type === 'duplas' && (
                                    <div>
                                      <Label htmlFor="partner-id" className="text-sm">ID do Parceiro</Label>
                                      <Input
                                        id="partner-id"
                                        value={partnerUserId}
                                        onChange={(e) => setPartnerUserId(e.target.value.toUpperCase())}
                                        placeholder="Ex: ABC123XY"
                                        className="uppercase text-base"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Peça o ID único do seu parceiro (encontrado no perfil dele)
                                      </p>
                                    </div>
                                  )}

                                  {selectedTournament.type === 'super8' && (
                                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                      <div className="flex items-center mb-2">
                                        <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                        <p className="text-sm font-semibold text-purple-700">Como funciona o SUPER 8:</p>
                                      </div>
                                      <ul className="text-xs text-purple-600 space-y-1">
                                        <li>• Você entra sozinho no torneio</li>
                                        <li>• Sistema forma duplas diferentes a cada rodada</li>
                                        <li>• Todos jogam com todos ao longo do torneio</li>
                                        <li>• Classificação individual por saldo de games</li>
                                      </ul>
                                    </div>
                                  )}
                                  
                                  <Button 
                                    onClick={() => {
                                      if (selectedTournament) {
                                        handleJoinTournament(selectedTournament.id)
                                        setShowJoinTournament(false)
                                      }
                                    }} 
                                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base"
                                  >
                                    Confirmar Inscrição
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </>
                      )}
                      
                      {selectedTournament.status === 'andamento' && selectedTournament.type !== 'super8' && areAllGroupMatchesCompleted(selectedTournament) && (
                        <Button
                          onClick={() => generateBracket(selectedTournament.id)}
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                        >
                          <Swords className="w-4 h-4 mr-2" />
                          Gerar Eliminatórias
                        </Button>
                      )}
                      
                      {/* Botão de Edição Manual */}
                      {(currentUser.isAdmin || currentUser.id === selectedTournament.createdBy) && selectedTournament.status === 'andamento' && (
                        <Button
                          variant="outline"
                          onClick={() => handleManualEdit(selectedTournament)}
                          className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edição Manual
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        onClick={() => shareTournament(selectedTournament.shareLink)}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar
                      </Button>
                    </div>

                    <Tabs defaultValue="participants" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="participants">
                          {selectedTournament.type === 'duplas' ? 'Duplas' : 
                           selectedTournament.type === 'super8' ? 'Jogadores' : 'Participantes'}
                        </TabsTrigger>
                        <TabsTrigger value="matches">Jogos</TabsTrigger>
                        <TabsTrigger value="standings">
                          {selectedTournament.type === 'super8' ? 'Ranking' : 'Classificação'}
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="participants" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedTournament.participants.map((participant) => (
                            <Card key={participant.id} className="p-4">
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                    {participant.userName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">
                                    {participant.partnerName ? 
                                      `${participant.userName} & ${participant.partnerName}` : 
                                      participant.userName
                                    }
                                  </p>
                                  {selectedTournament.type === 'super8' && participant.gamesBalance !== undefined && (
                                    <p className="text-sm text-gray-600">
                                      Saldo: {participant.gamesBalance > 0 ? '+' : ''}{participant.gamesBalance} games
                                    </p>
                                  )}
                                  {selectedTournament.type !== 'super8' && (
                                    <p className="text-sm text-gray-600">
                                      {participant.wins || 0}V - {participant.losses || 0}D
                                    </p>
                                  )}
                                </div>
                                {participant.eliminated && (
                                  <Badge variant="destructive" className="text-xs">
                                    Eliminado
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                        
                        {selectedTournament.participants.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium">Nenhum participante inscrito</p>
                            <p className="text-xs">Aguardando inscrições...</p>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="matches" className="space-y-4">
                        {selectedTournament.matches.length > 0 ? (
                          <div className="space-y-6">
                            {selectedTournament.type === 'super8' ? (
                              // Agrupar jogos por rodada para SUPER 8
                              Object.entries(
                                selectedTournament.matches.reduce((acc, match) => {
                                  const round = match.roundNumber || 1
                                  if (!acc[round]) acc[round] = []
                                  acc[round].push(match)
                                  return acc
                                }, {} as Record<number, Match[]>)
                              ).map(([round, matches]) => (
                                <div key={round}>
                                  <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Rodada {round}
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {matches.map((match) => (
                                      <Card key={match.id} className="p-4 border-l-4 border-purple-500">
                                        <div className="space-y-3">
                                          <div className="flex justify-between items-center">
                                            <div className="text-sm font-medium text-purple-900">
                                              {match.player1Name} & {match.player1PartnerName}
                                            </div>
                                            <Badge variant={match.status === 'finalizada' ? 'default' : 'secondary'}>
                                              {match.status === 'finalizada' ? 'Finalizado' : 'Pendente'}
                                            </Badge>
                                          </div>
                                          <div className="text-center text-xs text-gray-500">VS</div>
                                          <div className="text-sm font-medium text-purple-900">
                                            {match.player2Name} & {match.player2PartnerName}
                                          </div>
                                          {match.score && (
                                            <div className="text-center p-2 bg-purple-50 rounded text-sm font-mono">
                                              {match.score}
                                            </div>
                                          )}
                                          {match.status === 'pendente' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
                                              onClick={() => {
                                                setSelectedMatch(match)
                                                setShowMatchResult(true)
                                              }}
                                            >
                                              <Edit3 className="w-4 h-4 mr-2" />
                                              Inserir Resultado
                                            </Button>
                                          )}
                                        </div>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              ))
                            ) : (
                              // Agrupar jogos por fase para torneios normais
                              Object.entries(
                                selectedTournament.matches.reduce((acc, match) => {
                                  const phase = match.phase === 'grupos' ? 
                                    (match.groupId ? `Grupo ${match.groupId}` : 'Grupos') : 
                                    `Eliminatórias - ${match.round || 'Fase Final'}`
                                  if (!acc[phase]) acc[phase] = []
                                  acc[phase].push(match)
                                  return acc
                                }, {} as Record<string, Match[]>)
                              ).map(([phase, matches]) => (
                                <div key={phase}>
                                  <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                                    {phase.includes('Grupo') ? (
                                      <Users className="w-5 h-5 mr-2" />
                                    ) : (
                                      <Swords className="w-5 h-5 mr-2" />
                                    )}
                                    {phase}
                                  </h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {matches.map((match) => (
                                      <Card key={match.id} className="p-4 border-l-4 border-orange-500">
                                        <div className="space-y-3">
                                          <div className="flex justify-between items-center">
                                            <div className="text-sm font-medium text-orange-900">
                                              {match.player1Name}
                                            </div>
                                            <Badge variant={match.status === 'finalizada' ? 'default' : 'secondary'}>
                                              {match.status === 'finalizada' ? 'Finalizado' : 'Pendente'}
                                            </Badge>
                                          </div>
                                          <div className="text-center text-xs text-gray-500">VS</div>
                                          <div className="text-sm font-medium text-orange-900">
                                            {match.player2Name}
                                          </div>
                                          {match.score && (
                                            <div className="text-center p-2 bg-orange-50 rounded text-sm font-mono">
                                              {match.score}
                                            </div>
                                          )}
                                          {match.status === 'pendente' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                                              onClick={() => {
                                                setSelectedMatch(match)
                                                setShowMatchResult(true)
                                              }}
                                            >
                                              <Edit3 className="w-4 h-4 mr-2" />
                                              Inserir Resultado
                                            </Button>
                                          )}
                                        </div>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium">Nenhum jogo agendado</p>
                            <p className="text-xs">
                              {selectedTournament.type === 'super8' ? 
                                'Inicie o SUPER 8 para gerar os jogos' : 
                                'Gere os grupos para criar os jogos'
                              }
                            </p>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="standings" className="space-y-4">
                        {selectedTournament.groups.length > 0 ? (
                          <div className="space-y-6">
                            {selectedTournament.groups.map((group) => (
                              <Card key={group.id}>
                                <CardHeader className={`text-white ${
                                  selectedTournament.type === 'super8' 
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-600' 
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                }`}>
                                  <CardTitle className="text-lg">{group.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Pos
                                          </th>
                                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {selectedTournament.type === 'super8' ? 'Jogador' : 'Participante'}
                                          </th>
                                          {selectedTournament.type === 'super8' ? (
                                            <>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Saldo
                                              </th>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                G+
                                              </th>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                G-
                                              </th>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Derrotas
                                              </th>
                                            </>
                                          ) : (
                                            <>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                V
                                              </th>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                D
                                              </th>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Sets
                                              </th>
                                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Games
                                              </th>
                                            </>
                                          )}
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {group.standings
                                          .sort((a, b) => {
                                            if (selectedTournament.type === 'super8') {
                                              // Critérios SUPER 8: saldo de games, depois games vencidos, depois menos derrotas
                                              if ((b.gamesBalance || 0) !== (a.gamesBalance || 0)) {
                                                return (b.gamesBalance || 0) - (a.gamesBalance || 0)
                                              }
                                              if ((b.gamesWon || 0) !== (a.gamesWon || 0)) {
                                                return (b.gamesWon || 0) - (a.gamesWon || 0)
                                              }
                                              return (a.defeats || 0) - (b.defeats || 0)
                                            } else {
                                              // Critérios ITF: vitórias, depois % sets, depois % games, depois diferença de pontos
                                              if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon
                                              if (b.setsPercentage !== a.setsPercentage) return b.setsPercentage - a.setsPercentage
                                              if (b.gamesPercentage !== a.gamesPercentage) return b.gamesPercentage - a.gamesPercentage
                                              return b.pointsDiff - a.pointsDiff
                                            }
                                          })
                                          .map((standing, index) => (
                                            <tr key={standing.participantId} className={index < 2 ? 'bg-green-50' : ''}>
                                              <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-50 text-gray-600'
                                                  }`}>
                                                    {index + 1}
                                                  </span>
                                                  {index === 0 && <Crown className="w-4 h-4 ml-1 text-yellow-600" />}
                                                  {index === 1 && <Medal className="w-4 h-4 ml-1 text-gray-600" />}
                                                </div>
                                              </td>
                                              <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                  {standing.participantName}
                                                </div>
                                              </td>
                                              {selectedTournament.type === 'super8' ? (
                                                <>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className={`text-sm font-medium ${
                                                      (standing.gamesBalance || 0) > 0 ? 'text-green-600' :
                                                      (standing.gamesBalance || 0) < 0 ? 'text-red-600' : 'text-gray-900'
                                                    }`}>
                                                      {(standing.gamesBalance || 0) > 0 ? '+' : ''}{standing.gamesBalance || 0}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                                    {standing.gamesWon || 0}
                                                  </td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                                    {standing.gamesLost || 0}
                                                  </td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                                    {standing.defeats || 0}
                                                  </td>
                                                </>
                                              ) : (
                                                <>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                                    {standing.matchesWon}
                                                  </td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                                    {standing.matchesLost}
                                                  </td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                                    {standing.setsWon}/{standing.setsLost}
                                                  </td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                                    {standing.gamesWon}/{standing.gamesLost}
                                                  </td>
                                                </>
                                              )}
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium">Classificação não disponível</p>
                            <p className="text-xs">
                              {selectedTournament.type === 'super8' ? 
                                'Inicie o SUPER 8 para ver o ranking' : 
                                'Gere os grupos para ver a classificação'
                              }
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && currentUser.isAdmin && (
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel Administrativo ITF + SUPER 8</h2>
            
            {/* Configurações do WhatsApp */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardTitle className="text-lg sm:text-xl flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Configurar WhatsApp
                </CardTitle>
                <CardDescription className="text-green-100 text-sm sm:text-base">
                  Configure o link do WhatsApp para o botão "Seja Organizador"
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="whatsapp-link" className="text-sm">Link do WhatsApp</Label>
                    <Input
                      id="whatsapp-link"
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      placeholder="https://wa.me/5511999999999?text=Olá, gostaria de ser organizador"
                      className="text-base"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use o formato: https://wa.me/SEUNUMERO?text=MENSAGEM
                    </p>
                  </div>
                  <Button 
                    onClick={handleSaveWhatsappLink}
                    className="bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-300 hover:scale-105"
                    type="button"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Link
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <CardTitle className="text-lg sm:text-xl">Gerenciar Usuários</CardTitle>
                <CardDescription className="text-orange-100 text-sm sm:text-base">
                  Controle as permissões dos usuários para criar torneios ITF e SUPER 8
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {users.filter(u => !u.isAdmin).map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl bg-white shadow-sm space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base">{user.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{user.email}</p>
                          <p 
                            className="text-xs text-gray-400 flex items-center cursor-pointer hover:text-orange-600 transition-colors"
                            onClick={() => copyUserId(user.userId)}
                            title="Clique para copiar ID"
                          >
                            <Hash className="w-3 h-3 mr-1" />
                            ID: {user.userId}
                            <Copy className="w-3 h-3 ml-1" />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <Badge variant={user.canCreateTournaments ? 'default' : 'secondary'} className={`text-xs ${
                          user.canCreateTournaments ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          {user.canCreateTournaments ? 'Pode criar torneios' : 'Sem permissão'}
                        </Badge>
                        <Button
                          size="sm"
                          variant={user.canCreateTournaments ? 'destructive' : 'default'}
                          onClick={() => toggleUserPermission(user.id)}
                          className={`text-xs ${!user.canCreateTournaments ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700' : ''}`}
                        >
                          <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          {user.canCreateTournaments ? 'Remover' : 'Autorizar'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <CardTitle className="text-lg sm:text-xl">Gerenciar Torneios</CardTitle>
                <CardDescription className="text-blue-100 text-sm sm:text-base">
                  Visualize e gerencie todos os torneios ITF e SUPER 8 da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {tournaments.map((tournament) => (
                    <div key={tournament.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl bg-white shadow-sm space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900">{tournament.name}</h3>
                          {tournament.type === 'super8' && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              SUPER 8
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Criado por: {users.find(u => u.id === tournament.createdBy)?.name || 'Usuário não encontrado'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1">
                          <span>
                            {tournament.participants.length} {
                              tournament.type === 'duplas' ? 'duplas' : 
                              tournament.type === 'super8' ? 'jogadores' : 
                              'participantes'
                            }
                          </span>
                          <span className="capitalize">{tournament.category}</span>
                          <span className="capitalize">{tournament.gender}</span>
                          <span>{tournament.location || 'Local não definido'}</span>
                          {tournament.type !== 'super8' && (
                            <span>{getSetFormatDisplay(tournament.setFormat || 'melhor_3_sets')}</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {tournament.type === 'super8' ? 'SUPER 8' : 'ITF 2025'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <Badge
                          variant={
                            tournament.status === 'andamento' ? 'default' :
                            tournament.status === 'finalizado' ? 'secondary' : 'outline'
                          }
                          className={`text-xs ${
                            tournament.status === 'andamento' ? 'bg-green-500' :
                            tournament.status === 'finalizado' ? 'bg-purple-500' : 'border-orange-500 text-orange-600'
                          }`}
                        >
                          {tournament.status === 'criado' ? 'Aberto' :
                           tournament.status === 'andamento' ? 'Em andamento' : 'Finalizado'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTournament(tournament.id)}
                          className="text-xs"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tournaments.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-base sm:text-lg font-semibold">Nenhum torneio encontrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              todos os direitos reservados, victor hugo. ceo
            </p>
          </div>
        </div>
      </footer>

      {/* Dialog para inserir resultado */}
      <Dialog open={showMatchResult} onOpenChange={setShowMatchResult}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Inserir Resultado {selectedMatch?.tournamentId && tournaments.find(t => t.id === selectedMatch.tournamentId)?.type === 'super8' ? 'SUPER 8' : 'ITF'}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Digite o placar seguindo as regras ITF de Beach Tennis
            </DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {selectedMatch.player1Name}
                  {selectedMatch.player1PartnerName && ` & ${selectedMatch.player1PartnerName}`}
                </div>
                <div className="text-xs text-gray-500 mb-2">VS</div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedMatch.player2Name}
                  {selectedMatch.player2PartnerName && ` & ${selectedMatch.player2PartnerName}`}
                </div>
              </div>
              
              <div>
                <Label htmlFor="match-score" className="text-sm">Placar ITF</Label>
                <Input
                  id="match-score"
                  value={matchResult.score}
                  onChange={(e) => setMatchResult({...matchResult, score: e.target.value})}
                  placeholder="Ex: 6-4 6-2 ou 6-4 4-6 [10-8]"
                  className="text-base font-mono"
                />
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p><strong>Formatos aceitos:</strong></p>
                  <p>• <code>6-4 6-2</code> - Vitória 2-0 em sets</p>
                  <p>• <code>6-4 4-6 [10-8]</code> - Empate 1-1 + match tie-break</p>
                  <p>• <code>7-6 6-4</code> - Com tie-break no 1º set</p>
                </div>
              </div>
              
              <Button 
                onClick={handleMatchResult} 
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 h-12 text-base"
                disabled={!matchResult.score.trim()}
              >
                Salvar Resultado
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para edição manual */}
      <Dialog open={showManualEdit} onOpenChange={setShowManualEdit}>
        <DialogContent className="w-[95vw] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center">
              <Edit3 className="w-5 h-5 mr-2" />
              Edição Manual - {editingTournament?.name}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Gerencie a ordem dos jogos, corrija resultados e ajuste classificações
            </DialogDescription>
          </DialogHeader>
          
          {editingTournament && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Use esta funcionalidade apenas para correções necessárias. 
                    Mudanças podem afetar a classificação e o andamento do torneio.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Jogos do Torneio</h3>
                
                {editingTournament.matches.length > 0 ? (
                  <div className="space-y-4">
                    {editingTournament.matches.map((match, index) => (
                      <Card key={match.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {match.phase === 'grupos' ? 
                                  (match.groupId ? `Grupo ${match.groupId}` : 'Grupos') : 
                                  `${match.round || 'Eliminatórias'}`
                                }
                              </Badge>
                              {match.roundNumber && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                                  Rodada {match.roundNumber}
                                </Badge>
                              )}
                              <Badge variant={match.status === 'finalizada' ? 'default' : 'secondary'}>
                                {match.status === 'finalizada' ? 'Finalizado' : 'Pendente'}
                              </Badge>
                            </div>
                            
                            <div className="text-sm">
                              <p className="font-medium">
                                {match.player1Name}
                                {match.player1PartnerName && ` & ${match.player1PartnerName}`}
                              </p>
                              <p className="text-gray-500 text-xs">VS</p>
                              <p className="font-medium">
                                {match.player2Name}
                                {match.player2PartnerName && ` & ${match.player2PartnerName}`}
                              </p>
                            </div>
                            
                            {match.score && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-mono">
                                {match.score}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col space-y-2 ml-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveMatchUp(match.id)}
                                disabled={index === 0}
                                className="text-xs"
                              >
                                <Move className="w-3 h-3 mr-1" />
                                ↑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => moveMatchDown(match.id)}
                                disabled={index === editingTournament.matches.length - 1}
                                className="text-xs"
                              >
                                <Move className="w-3 h-3 mr-1" />
                                ↓
                              </Button>
                            </div>
                            
                            {match.status === 'finalizada' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => resetMatchResult(match.id)}
                                className="text-xs"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">Nenhum jogo encontrado</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowManualEdit(false)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setShowManualEdit(false)
                    toast.success('Alterações salvas com sucesso!')
                  }}
                  className="bg-gradient-to-r from-orange-500 to-red-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
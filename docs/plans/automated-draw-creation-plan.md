# Automated Draw Creation Implementation Plan

**Project:** Old Man Footy - Automated Draw Creation System  
**Created:** September 29, 2025  
**Status:** Planning Phase  

## Overview

Implement an intelligent draw generation system that automatically creates fair and balanced tournament draws for Masters Rugby League carnivals. The system will support multiple matching algorithms and provide carnival organizers with flexible configuration options to suit their specific tournament requirements.

## Current State Analysis

### ✅ Existing Infrastructure
- [x] **Carnival Model** - Complete carnival information and management
- [x] **CarnivalClub Model** - Club registration and participation tracking
- [x] **CarnivalClubPlayer Model** - Individual player registration with team assignments
- [x] **Club Model** - Club information including location and contact details
- [x] **Admin Interface** - Existing carnival management UI for delegates
- [x] **Authentication System** - Role-based access control for carnival organizers
- [x] **Database Migration System** - Sequelize migrations for schema updates

### 🔍 Current Draw Management
Currently, draws are managed manually by carnival organizers:
- Draw sheets can be uploaded as images or documents
- No automated draw generation capabilities
- No standardized draw format or structure
- Limited support for complex tournament formats

### ❌ Missing Components for Automated Draw Creation
- [ ] **Draw Generation Service** - Core algorithm engine
- [ ] **Draw Configuration Model** - Store organizer preferences and rules
- [ ] **Team Assignment Logic** - Intelligent team grouping algorithms
- [ ] **Draw Visualization** - Generate visual draw sheets
- [ ] **Draw Export/Import** - Standard formats for draw sharing
- [ ] **Conflict Resolution** - Handle scheduling and venue conflicts
- [ ] **Draw Templates** - Pre-configured tournament formats
- [ ] **Historical Analysis** - Learn from past draw performance

## Tournament Format Analysis

### Common Masters Rugby League Tournament Formats

#### 1. **Fixed Games Format (Most Common)**
- Each team plays a specified number of games (typically 2-4 games)
- All games are "friendlies" - no elimination or ranking
- No finals or knockout stages (Masters philosophy: "no results")
- Games distributed across carnival days (e.g., 2 games day 1, 1 game day 2)
- Focus on participation and enjoyment rather than competition

#### 2. **Rep Rounds (Representative Games)**
- Special showcase games featuring selected players from multiple teams
- Custom Team Names (e.g. Barbarians, or "Dragons" vs "Steelers"), will not be registered club teams
- Typically up to 1 rep round per carnival day (often featured games)
- Players selected by carnival organizers or club managers, from the pool of players in the carnival
- Scheduled at prime times (e.g., end-of-day showcase)
- Must be factored into player availability for regular team games
- May have different game formats (longer halves, special rules (e.g. specified shorts colors for modified contact rules))

#### 3. **Finals Format (Optional)**
- Available only when explicitly requested by organizers
- Requires organizer to opt-into competitive format
- Not recommended for traditional Masters philosophy
- Should include clear warnings about departure from standard format

## Draw Generation Algorithms

### Algorithm 1: Random Assignment
**Use Case:** Simple, unbiased draw creation  
**Implementation:** Standard randomization with intra-club avoidance

```javascript
class RandomDrawGenerator {
  generateDraw(teams, configuration) {
    // Shuffle teams randomly
    // Avoid pairing teams from same club (unless explicitly allowed)
    // Distribute games across specified carnival days
    // Create fixed number of games per team (no elimination)
    // Ensure game distribution matches organizer requirements (e.g., 2 day 1, 1 day 2)
  }
}
```

### Algorithm 2: Single-Criteria Generators
**Use Case:** Focus on one specific sorting rule  
**Implementation:** Specialized algorithms for individual criteria

```javascript
class ShortsMatchingDrawGenerator {
  generateDraw(teams, configuration) {
    // Group teams by their coloured shorts composition
    // Count players wearing red (grab/hold), yellow (touch), green (70-79), blue (80+)
    // Match teams with similar modified-rules player distributions
    // Avoid pairing full-contact teams with high modified-rules teams
    // Avoid pairing teams from same club (unless explicitly allowed)
    // Create fixed games per team with time-based scheduling
    // Ensure balanced gameplay experience for all participants
  }
}

class GeographicDrawGenerator {
  generateDraw(teams, configuration) {
    // Calculate distances between club locations
    // Minimize local matchups while avoiding intra-club games
    // Distribute games across carnival days as specified
    // Balance travel considerations with game scheduling constraints
    // Fit games within organizer-specified time windows
  }
}
```

### Algorithm 3: Multi-Criteria Combination Generator
**Use Case:** Combine multiple sorting rules simultaneously  
**Implementation:** Weighted multi-objective optimization

```javascript
class MultiCriteriaDrawGenerator {
  generateDraw(teams, configuration) {
    const enabledRules = configuration.sortingRules;
    const weights = configuration.ruleWeights;
    
    // Generate regular matches first
    const regularDraw = this.generateRegularMatches(teams, configuration, enabledRules, weights);
    
    // Add rep rounds if enabled
    if (configuration.tournament_settings?.rep_rounds?.enabled) {
      const repRounds = this.generateRepRounds(teams, configuration);
      return this.integrateRepRoundsIntoDraw(regularDraw, repRounds, configuration);
    }
    
    return regularDraw;
  }
  
  generateRegularMatches(teams, configuration, enabledRules, weights) {
    // Score all possible team matchups against multiple criteria
    const scores = this.calculateMultiCriteriaScores(teams, enabledRules, weights);
    
    // Apply intra-club avoidance (unless explicitly disabled)
    const filteredScores = this.applyIntraClubConstraints(scores, configuration);
    
    // Use optimization algorithm to find best overall solution
    return this.optimizeDrawFromScores(teams, filteredScores, configuration);
  }
  
  calculateMultiCriteriaScores(teams, rules, weights) {
    // Geographic score (if enabled)
    // Shorts matching score (if enabled) - modified contact rules compatibility
    // Age balance score (if enabled) - similar age team matching
    // Intra-club avoidance score (unless disabled)
    // Custom rule scores (if enabled)
    // Combine all scores using weights
  }
  
  generateRepRounds(teams, configuration) {
    if (!configuration.enable_rep_rounds || configuration.rep_rounds_per_day === 0) {
      return [];
    }
    
    const repRounds = [];
    const totalDays = configuration.carnival_days;
    const repRoundsPerDay = configuration.rep_rounds_per_day;
    
    for (let day = 1; day <= totalDays; day++) {
      for (let roundNum = 1; roundNum <= repRoundsPerDay; roundNum++) {
        const repRound = {
          match_type: 'rep_round',
          day: day,
          rep_round_title: configuration.rep_round_team_names?.a_team || `Rep Team A`,
          rep_round_description: `Representative match showcasing selected players from multiple clubs`,
          rep_round_team_a_name: configuration.rep_round_team_names?.a_team || 'Rep Team A',
          rep_round_team_b_name: configuration.rep_round_team_names?.b_team || 'Rep Team B',
          duration_minutes: configuration.rep_round_duration_minutes || configuration.match_duration_minutes,
          selection_method: configuration.rep_round_selection_method,
          timing: configuration.rep_round_timing
        };
        
        repRounds.push(repRound);
      }
    }
    
    return repRounds;
  }
  
  integrateRepRoundsIntoDraw(regularMatches, repRounds, configuration) {
    if (!repRounds || repRounds.length === 0) {
      return regularMatches;
    }
    
    const integratedDraw = [...regularMatches];
    
    // Schedule rep rounds based on timing preference
    repRounds.forEach(repRound => {
      const dayMatches = integratedDraw.filter(match => match.day === repRound.day);
      
      switch (repRound.timing) {
        case 'start_of_day':
          // Insert at beginning of day
          const startIndex = integratedDraw.findIndex(match => match.day === repRound.day);
          if (startIndex !== -1) {
            integratedDraw.splice(startIndex, 0, repRound);
          } else {
            integratedDraw.push(repRound);
          }
          break;
          
        case 'end_of_day':
          // Insert at end of day
          let endIndex = integratedDraw.length;
          for (let i = integratedDraw.length - 1; i >= 0; i--) {
            if (integratedDraw[i].day === repRound.day) {
              endIndex = i + 1;
              break;
            }
          }
          integratedDraw.splice(endIndex, 0, repRound);
          break;
          
        case 'mid_day':
          // Insert in middle of day's matches
          const midIndex = Math.floor(dayMatches.length / 2);
          const actualMidIndex = integratedDraw.findIndex(match => match.day === repRound.day) + midIndex;
          integratedDraw.splice(actualMidIndex, 0, repRound);
          break;
          
        default:
          // Default to end of day
          integratedDraw.push(repRound);
      }
    });
    
    // Recalculate timing with 5-minute breaks for all matches including rep rounds
    return this.calculateMatchTimings(integratedDraw, configuration);
  }
  
  applyIntraClubConstraints(scores, configuration) {
    if (!configuration.allow_intra_club_matchups) {
      // Heavily penalize or eliminate same-club matchups
      return scores.filter(score => score.team1.clubId !== score.team2.clubId);
    }
    return scores;
  }
  
  calculateMatchTimings(matches, configuration) {
    let currentTime = new Date(`2024-01-01 ${configuration.start_time}`);
    const breakDurationMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return matches.map((match, index) => {
      const matchWithTiming = {
        ...match,
        start_time: new Date(currentTime).toTimeString().substr(0, 5), // HH:MM format
        end_time: null
      };
      
      // Calculate match duration (regular matches vs rep rounds)
      const durationMinutes = match.match_type === 'rep_round' 
        ? (configuration.rep_round_duration_minutes || configuration.match_duration_minutes)
        : configuration.match_duration_minutes;
      
      // Add match duration
      currentTime.setMinutes(currentTime.getMinutes() + durationMinutes);
      matchWithTiming.end_time = new Date(currentTime).toTimeString().substr(0, 5);
      
      // Add 5-minute break for next match (except last match of the day)
      const nextMatch = matches[index + 1];
      if (nextMatch && nextMatch.day === match.day) {
        currentTime.setTime(currentTime.getTime() + breakDurationMs);
      } else if (nextMatch && nextMatch.day !== match.day) {
        // Reset to start time for next day
        currentTime = new Date(`2024-01-01 ${configuration.start_time}`);
      }
      
      return matchWithTiming;
    });
  }
}
```

### Algorithm 4: Hybrid Intelligent Matching
**Use Case:** Advanced AI-powered multi-criteria optimization  
**Implementation:** Machine learning enhanced weighted scoring system

```javascript
class IntelligentDrawGenerator {
  generateDraw(teams, configuration) {
    // Score potential matchups based on multiple criteria
    // Apply carnival organizer preferences and weights
    // Use historical data to improve scoring
    // Optimize for fairness, variety, and logistics
    // Generate multiple options for organizer selection
  }
}
```

### Multi-Rule Combination Examples

#### Example 1: Location + Shorts Matching
**Scenario:** Prevent local rivalries while matching modified contact rules preferences
- **Primary Rule:** Geographic distribution (60% weight)
- **Secondary Rule:** Shorts matching for modified rules compatibility (40% weight)
- **Result:** Teams from different regions matched first, then paired based on similar modified-rules player distributions

#### Example 2: Location + Age Balance
**Scenario:** Diverse matchups with age-appropriate fairness
- **Primary Rule:** Geographic distribution (50% weight)
- **Secondary Rule:** Age group balancing (50% weight)
- **Result:** Cross-regional matchups with similarly aged team compositions

#### Example 3: All Rules Combined
**Scenario:** Maximum optimization across all criteria
- **Geographic:** 25% weight
- **Shorts Matching:** 25% weight (modified contact rules compatibility)
- **Age Balance:** 25% weight
- **Travel Optimization:** 25% weight
- **Result:** Balanced solution considering all factors

## Implementation Phases

### Phase 1: Core Draw Engine
**Duration:** 2-3 weeks  
**Priority:** HIGH

#### Database Schema Updates
- [ ] Create `DrawConfiguration` model
  - [ ] Carnival association and ownership
  - [ ] Tournament format selection (pool play, knockout, etc.)
  - [ ] Multi-criteria sorting rules configuration (JSON field)
  - [ ] Individual rule weights and priority settings
  - [ ] Rule combination method selection
  - [ ] Rule-specific configuration parameters
  - [ ] Pool/bracket size configurations
  - [ ] Timing and venue constraints
  - [ ] Optimization parameters (iterations, convergence thresholds)
- [ ] Create `TournamentDraw` model
  - [ ] Generated draw storage and versioning
  - [ ] Match scheduling and venue assignments
  - [ ] Status tracking (draft, published, completed)
- [ ] Create `DrawMatch` model
  - [ ] Individual match details
  - [ ] Team assignments and bye handling
  - [ ] Scheduling information (time, venue, field)
  - [ ] Result tracking integration
- [ ] Create migration files for new tables

#### Core Draw Generation Service
- [ ] Create `DrawGenerationService.mjs`
  - [ ] Abstract base class for draw generators
  - [ ] Plugin architecture for different algorithms
  - [ ] Configuration validation and error handling
  - [ ] Draw optimization and validation
- [ ] Implement `RandomDrawGenerator.mjs`
  - [ ] Basic random team assignment
  - [ ] Seeding support for skill-based distribution
  - [ ] Pool balancing algorithms
- [ ] Create `DrawValidationService.mjs`
  - [ ] Ensure minimum game guarantees
  - [ ] Validate venue and timing constraints
  - [ ] Check for logical inconsistencies

#### Basic Admin Interface Integration
- [ ] **Draw Configuration Page**
  - [ ] Tournament format selection
  - [ ] Algorithm preference settings
  - [ ] Preview and approval workflow
- [ ] **Draw Generation Workflow**
  - [ ] Generate multiple draw options
  - [ ] Side-by-side comparison interface
  - [ ] One-click generation and publishing

### Phase 2: Multi-Criteria Algorithms
**Duration:** 3-4 weeks  
**Priority:** MEDIUM

#### Individual Rule Scoring Components
- [ ] Implement `GeographicScorer.mjs`
  - [ ] Integration with club location data
  - [ ] Distance calculation and travel optimization
  - [ ] Regional rivalry management
  - [ ] Configurable distance thresholds
- [ ] Implement `ShortsMatchingScorer.mjs`
  - [ ] Modified contact rules player counting
  - [ ] Team distribution analysis (red/yellow/green/blue shorts)
  - [ ] Compatibility scoring based on similar rule preferences
  - [ ] Balance full-contact vs modified-rules team matching
- [ ] Implement `AgeBalanceScorer.mjs`
  - [ ] Player age analysis and team age profile calculation
  - [ ] Age group distribution comparison between teams
  - [ ] Configurable age similarity parameters
- [ ] Implement `TravelOptimizationScorer.mjs`
  - [ ] Travel cost calculation
  - [ ] Distance minimization algorithms
  - [ ] Fuel cost and time considerations

#### Multi-Criteria Draw Generator
- [ ] Implement `MultiCriteriaDrawGenerator.mjs`
  - [ ] Rule combination logic (weighted sum, lexicographic, pareto optimal)
  - [ ] Multi-objective optimization algorithms
  - [ ] Configuration validation and error handling
  - [ ] Draw quality scoring and metrics
- [ ] Implement `DrawOptimizer.mjs`
  - [ ] Genetic algorithm for draw optimization
  - [ ] Simulated annealing for local optimization
  - [ ] Convergence detection and early stopping
- [ ] Implement `IntelligentDrawGenerator.mjs`
  - [ ] Machine learning integration for pattern recognition
  - [ ] Historical data analysis for optimization
  - [ ] Adaptive weight adjustment based on outcomes

#### Advanced Configuration Options
- [ ] **Constraint Management**
  - [ ] Team availability and blackout dates
  - [ ] Venue capacity and field requirements
  - [ ] Travel distance limitations
- [ ] **Custom Rules Engine**
  - [ ] User-defined matching rules
  - [ ] Conditional logic for special requirements
  - [ ] Rule conflict resolution

#### Draw Visualization
- [ ] **Visual Draw Display**
  - [ ] Interactive bracket and pool visualizations
  - [ ] Responsive design for mobile viewing
  - [ ] Print-friendly draw sheet generation
- [ ] **Draw Export Formats**
  - [ ] PDF draw sheets with club logos
  - [ ] CSV format for external systems
  - [ ] JSON API for third-party integrations

### Phase 3: Enhanced Features
**Duration:** 2-3 weeks  
**Priority:** MEDIUM

#### Historical Analysis and Learning
- [ ] **Draw Performance Tracking**
  - [ ] Game duration and quality metrics
  - [ ] Spectator engagement measurements
  - [ ] Organizer satisfaction surveys
- [ ] **Algorithm Improvement**
  - [ ] Machine learning from historical data
  - [ ] Automatic parameter tuning
  - [ ] Success pattern recognition

#### Advanced Tournament Management
- [ ] **Dynamic Draw Adjustments**
  - [ ] Handle team withdrawals and additions
  - [ ] Weather and venue change management
  - [ ] Real-time draw modifications
- [ ] **Multi-Day Tournament Support**
  - [ ] Complex scheduling across multiple days
  - [ ] Rest period optimization
  - [ ] Accommodation and travel coordination

#### Integration Features
- [ ] **MySideline Integration**
  - [ ] Automatic team data synchronization
  - [ ] Player availability checking
  - [ ] Registration status validation
- [ ] **Result Integration**
  - [ ] Automatic advancement to next rounds
  - [ ] Standings calculation and display
  - [ ] Championship tracking

### Phase 4: Analytics and Optimization
**Duration:** 1-2 weeks  
**Priority:** LOW

#### Performance Analytics
- [ ] **Draw Quality Metrics**
  - [ ] Age balance measurements
  - [ ] Travel efficiency analysis
  - [ ] Schedule optimization scoring
- [ ] **Usage Analytics**
  - [ ] Algorithm preference tracking
  - [ ] Configuration pattern analysis
  - [ ] User satisfaction metrics

#### Advanced Optimization
- [ ] **AI-Powered Suggestions**
  - [ ] Optimal tournament format recommendations
  - [ ] Venue and timing suggestions
  - [ ] Team seeding recommendations
- [ ] **Predictive Analytics**
  - [ ] Expected game duration predictions
  - [ ] Crowd size estimations
  - [ ] Resource requirement forecasting

## Technical Implementation Details

### Service Architecture

```javascript
// services/draw/DrawGenerationService.mjs
class DrawGenerationService {
  constructor() {
    this.generators = new Map();
    this.registerGenerators();
  }

  // Core methods
  async generateDraw(carnivalId, configuration) {
    const teams = await this.getRegisteredTeams(carnivalId);
    const generator = this.getGenerator(configuration.algorithm);
    const draw = await generator.generateDraw(teams, configuration);
    return await this.validateAndSave(draw, carnivalId);
  }

  async validateDraw(draw) {
    // Ensure all teams have minimum games
    // Check venue and timing constraints
    // Validate tournament format rules
  }

  async optimizeDraw(draw, objectives) {
    // Apply optimization algorithms
    // Balance multiple competing objectives
    // Return improved draw version
  }
}
```

### Database Models

```javascript
// models/DrawConfiguration.mjs
class DrawConfiguration extends Model {
  static associate(models) {
    DrawConfiguration.belongsTo(models.Carnival);
    DrawConfiguration.hasMany(models.TournamentDraw);
  }
  
  // Add Masters-specific fields including rep rounds
  static init(sequelize, DataTypes) {
    return super.init({
      algorithm: DataTypes.STRING,
      tournament_format: DataTypes.STRING, // 'fixed_games', 'round_robin', etc.
      games_per_team: DataTypes.INTEGER,
      allow_finals: DataTypes.BOOLEAN,
      allow_intra_club_matchups: DataTypes.BOOLEAN,
      
      // Rep Rounds Configuration
      enable_rep_rounds: DataTypes.BOOLEAN,
      rep_rounds_per_day: DataTypes.INTEGER,
      rep_round_duration_minutes: DataTypes.INTEGER,
      rep_round_timing: DataTypes.STRING, // 'morning', 'lunchtime', 'afternoon', 'evening'
      rep_round_selection_method: DataTypes.STRING, // 'regional', 'age_based', 'skill_based'
      
      start_time: DataTypes.TIME,
      end_time: DataTypes.TIME,
      break_duration_minutes: DataTypes.INTEGER,
      half_length_minutes: DataTypes.INTEGER,
      configuration_json: DataTypes.TEXT
    }, { sequelize });
  }
}

// models/TournamentDraw.mjs
class TournamentDraw extends Model {
  static associate(models) {
    TournamentDraw.belongsTo(models.DrawConfiguration);
    TournamentDraw.hasMany(models.DrawMatch);
    TournamentDraw.belongsTo(models.User, { as: 'CreatedBy' });
  }
  
  // Add scheduling fields including rep rounds tracking
  static init(sequelize, DataTypes) {
    return super.init({
      draw_name: DataTypes.STRING,
      total_matches: DataTypes.INTEGER,
      total_rep_rounds: DataTypes.INTEGER, // Track number of rep rounds
      total_rounds: DataTypes.INTEGER,
      estimated_duration_minutes: DataTypes.INTEGER,
      generation_algorithm: DataTypes.STRING,
      intra_club_violations: DataTypes.INTEGER, // Track violations if any
      draw_data: DataTypes.TEXT
    }, { sequelize });
  }
}

// models/DrawMatch.mjs
class DrawMatch extends Model {
  static associate(models) {
    DrawMatch.belongsTo(models.TournamentDraw);
    DrawMatch.belongsTo(models.CarnivalClub, { as: 'HomeTeam' });
    DrawMatch.belongsTo(models.CarnivalClub, { as: 'AwayTeam' });
  }
  
  // Enhanced match scheduling including rep rounds
  static init(sequelize, DataTypes) {
    return super.init({
      round_number: DataTypes.INTEGER,
      match_number: DataTypes.INTEGER,
      match_type: DataTypes.STRING, // 'regular', 'rep_round'
      
      // Rep Round specific fields
      rep_round_title: DataTypes.STRING, // e.g., "North vs South Rep Round"
      rep_round_description: DataTypes.TEXT,
      rep_round_team_a_name: DataTypes.STRING, // e.g., "Northern Region"
      rep_round_team_b_name: DataTypes.STRING, // e.g., "Southern Region"
      
      scheduled_time: DataTypes.TIME,
      estimated_end_time: DataTypes.TIME,
      carnival_day: DataTypes.INTEGER, // Multi-day support
      field_number: DataTypes.INTEGER,
      is_final: DataTypes.BOOLEAN, // False for Masters typically
      home_team_score: DataTypes.INTEGER,
      away_team_score: DataTypes.INTEGER,
      match_status: DataTypes.STRING // 'scheduled', 'completed', 'cancelled'
    }, { sequelize });
  }
}

// models/RepRoundTeam.mjs (New model for representative teams)
class RepRoundTeam extends Model {
  static associate(models) {
    RepRoundTeam.belongsTo(models.DrawMatch);
    RepRoundTeam.hasMany(models.RepRoundPlayer);
  }
  
  static init(sequelize, DataTypes) {
    return super.init({
      team_name: DataTypes.STRING, // e.g., "North Region", "Over 70s"
      team_type: DataTypes.STRING, // 'regional', 'age_based', 'skill_based', 'club_based'
      description: DataTypes.TEXT,
      selection_criteria: DataTypes.TEXT, // How players are selected
      coach_name: DataTypes.STRING,
      team_color: DataTypes.STRING // Jersey color for the rep team
    }, { sequelize });
  }
}

// models/RepRoundPlayer.mjs (New model for tracking selected players)
class RepRoundPlayer extends Model {
  static associate(models) {
    RepRoundPlayer.belongsTo(models.RepRoundTeam);
    RepRoundPlayer.belongsTo(models.CarnivalClubPlayer, { as: 'Player' });
  }
  
  static init(sequelize, DataTypes) {
    return super.init({
      position: DataTypes.STRING, // Playing position in rep team
      selection_reason: DataTypes.STRING, // Why player was selected
      is_confirmed: DataTypes.BOOLEAN, // Has player accepted invitation
      is_available: DataTypes.BOOLEAN, // Is player available for the time slot
      jersey_number: DataTypes.INTEGER // Number for rep game
    }, { sequelize });
  }
}

// models/ClubTeamAssociation.mjs (New model for intra-club tracking)
class ClubTeamAssociation extends Model {
  static associate(models) {
    ClubTeamAssociation.belongsTo(models.Club);
    ClubTeamAssociation.belongsTo(models.CarnivalClub);
  }
  
  static init(sequelize, DataTypes) {
    return super.init({
      club_id: DataTypes.INTEGER,
      carnival_club_id: DataTypes.INTEGER,
      team_name: DataTypes.STRING,
      team_number: DataTypes.INTEGER
    }, { sequelize });
  }
}
```

### Algorithm Plugin System

```javascript
// services/draw/generators/BaseDrawGenerator.mjs
class BaseDrawGenerator {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  // Abstract methods to be implemented by subclasses
  async generateDraw(teams, configuration) {
    throw new Error('generateDraw must be implemented by subclass');
  }

  async validateConfiguration(configuration) {
    // Common validation logic
  }

  async calculateDrawScore(draw, criteria) {
    // Common scoring methodology
  }
}
```

## Configuration Schema

### Draw Configuration Options

```javascript
const drawConfiguration = {
  // Masters Rugby League Tournament Format (Default: Fixed Games Format)
  format: 'fixed_games', // 'fixed_games', 'round_robin', 'structured_friendly', 'finals_optional'
  
  // Algorithm Selection
  algorithm: 'multi_criteria', // 'random', 'single_criteria', 'multi_criteria', 'intelligent'
  
  // Tournament Structure (Masters-specific)
  tournament_settings: {
    games_per_team: 3, // Each team plays fixed number of games
    allow_finals: false, // Masters typically avoid finals ("no results")
    game_distribution: {
      day_1: 2,
      day_2: 1
    },
    
    // Rep Rounds Configuration
    rep_rounds: {
      enabled: false, // Enable representative rounds
      rounds_per_day: 1, // Typically 1 rep round per day
      duration_minutes: 25, // Usually longer than regular games
      timing: 'lunchtime', // 'morning', 'lunchtime', 'afternoon', 'evening'
      selection_method: 'regional', // 'regional', 'age_based', 'skill_based'
      team_names: {
        team_a: 'Northern Region',
        team_b: 'Southern Region'
      },
      description: 'Showcase match featuring selected players from multiple teams',
      requires_player_confirmation: true // Players must confirm availability
    },
    
    scheduling: {
      start_time: '09:00',
      end_time: '16:00',
      break_duration_minutes: 5,
      half_length_minutes: 15
    }
  },
  
  // Club Management (Intra-club avoidance)
  club_preferences: {
    allow_intra_club_matchups: false, // Default: avoid same-club teams playing
    same_club_penalty_weight: 0.9, // Heavy penalty for same-club matchups when enabled
    club_balance_priority: 'high' // 'high', 'medium', 'low'
  },
  
  // Multi-Criteria Sorting Rules (Multiple rules can be enabled)
  sortingRules: [
    {
      type: 'geographic_distribution',
      enabled: true,
      weight: 30,
      priority: 1,
      config: {
        min_distance_km: 50,
        avoid_local_rivals: true,
        regional_balance: true
      }
    },
    {
      type: 'shorts_matching',
      enabled: true,
      weight: 25,
      priority: 2,
      config: {
        balance_modified_rules: true,
        similarity_threshold: 0.7,
        modified_rules_colors: ['red', 'yellow', 'green', 'blue'],
        contact_rule_compatibility: true
      }
    },
    {
      type: 'age_balance',
      enabled: true,
      weight: 25,
      priority: 3,
      config: {
        age_variance_threshold: 5, // years
        age_group_weights: {
          'under_35': 1.0,
          '35_50': 1.0,
          '50_65': 1.0,
          'over_65': 1.0
        },
        prefer_similar_age_profiles: true
      }
    },
    {
      type: 'intra_club_avoidance',
      enabled: true,
      weight: 40, // High weight for Masters tournaments
      priority: 0, // Highest priority
      config: {
        strict_avoidance: true,
        allow_override: true,
        penalty_multiplier: 2.0
      }
    },
    {
      type: 'travel_optimization',
      enabled: false,
      weight: 20,
      priority: 4,
      config: {
        max_travel_distance: 200,
        fuel_cost_consideration: true,
        minimize_total_travel: true
      }
    }
  ],
  
  // Rule Combination Method
  combinationMethod: 'weighted_sum', // 'weighted_sum', 'lexicographic', 'pareto_optimal'
  
  // Legacy Algorithm Weights (for backwards compatibility)
  weights: {
    intra_club_avoidance: 0.4,
    geographic_distribution: 0.25,
    shorts_matching: 0.2,
    age_balance: 0.15,
    travel_optimization: 0.0
  },
  
  // Masters Tournament Structure (Fixed Games Format)
  structure: {
    total_teams: 24,
    games_per_team: 3, // Fixed number for all teams
    total_rounds: null, // Calculated automatically
    match_duration_minutes: 30, // 2 x 15 minute halves
    break_between_games: 5,
    finals_enabled: false, // Masters typically avoid finals
  },
  
  // Scheduling Constraints
  scheduling: {
    start_time: '08:00',
    game_duration: 30, // minutes
    break_between_games: 15,
    fields_available: 4,
    max_games_per_day: 8
  },
  
  // Custom Rules
  rules: {
    avoid_local_matchups_in_pool: true,
    separate_rival_clubs: ['Club A', 'Club B'],
    preferred_matchups: [['Club C', 'Club D']],
    blackout_periods: ['12:00-13:00'] // lunch break
  }
};
```

## User Interface Design

### Draw Configuration Wizard

#### Step 1: Masters Rugby League Tournament Setup
- [ ] **Tournament Format Selection**
  - [ ] Fixed Games Format (Default for Masters)
  - [ ] Games per team selector (2-4 typical range)
  - [ ] Multi-day game distribution editor
  - [ ] Finals toggle (Default: OFF for Masters)
- [ ] **Scheduling Configuration**
  - [ ] Start time / End time selectors
  - [ ] Break duration between games (Default: 5 minutes)
  - [ ] Half length selector (10/15/20/25 minutes)
  - [ ] Total tournament duration calculator
- [ ] **Club Management Settings**
  - [ ] Intra-club matchup toggle (Default: AVOID)
  - [ ] Same-club penalty weight slider
  - [ ] Multi-team club identification

#### Step 2: Multi-Criteria Sorting Rules Configuration
- [ ] **Rule Selection Interface**
  - [ ] Checkbox list of available sorting rules
  - [ ] Rule descriptions with Masters Rugby League examples
  - [ ] Enable/disable individual rules
  - [ ] Intra-club avoidance rule (Prominently featured, default ON)
- [ ] **Weight and Priority Configuration**
  - [ ] Interactive weight sliders for each enabled rule
  - [ ] Priority ordering with drag-and-drop interface
  - [ ] Real-time weight total validation (must sum to 100)
  - [ ] Intra-club avoidance weight (Default: 40% for Masters)
- [ ] **Rule-Specific Settings**
  - [ ] Intra-Club Avoidance: Strict enforcement, override options
  - [ ] Geographic: Distance thresholds, regional preferences
  - [ ] Shorts Matching: Modified contact rules compatibility, player count balance
  - [ ] Age Balance: Age group distribution, similarity thresholds (Masters-focused)
  - [ ] Travel Optimization: Maximum distance, cost factors
- [ ] **Combination Method Selection**
  - [ ] Weighted sum (recommended for Masters tournaments)
  - [ ] Lexicographic (priority-based with intra-club first)
  - [ ] Pareto optimal (advanced)
- [ ] **Preview and Validation**
  - [ ] Live preview showing intra-club conflict detection
  - [ ] Masters-specific quality metrics
  - [ ] Fixed games format validation

#### Step 3: Scheduling Setup
- [ ] **Time Block Configuration**
  - [ ] Interactive time slot builder
  - [ ] Game duration calculator (half length × 2 + break time)
  - [ ] Total games vs. time available validation
- [ ] **Venue and Field Configuration**
  - [ ] Number of fields available
  - [ ] Field capacity and suitability
  - [ ] Parallel game scheduling
- [ ] **Masters-Specific Constraints**
  - [ ] Age-appropriate scheduling (avoid early/late times)
  - [ ] Fixed games per team enforcement
  - [ ] Break time adequacy for Masters players

#### Step 4: Rep Rounds Configuration
- [ ] **Rep Rounds Enable/Disable**
  - [ ] Toggle to enable representative rounds
  - [ ] Information tooltip explaining rep rounds concept
  - [ ] Masters League rep round tradition explanation
- [ ] **Rep Rounds Frequency**
  - [ ] Rep rounds per day selector (0-3 typical range)
  - [ ] Total rep rounds calculator across carnival days
  - [ ] Impact on regular match scheduling preview
- [ ] **Rep Round Timing**
  - [ ] Timing preference selector:
    - [ ] Start of day (showcase opening)
    - [ ] Mid-day (intermission feature)  
    - [ ] End of day (closing exhibition)
  - [ ] Custom timing slot option
- [ ] **Rep Round Duration**
  - [ ] Duration selector (same as regular games or custom)
  - [ ] Half length configuration for rep rounds
  - [ ] Extended time option for showcase matches
- [ ] **Rep Team Configuration**
  - [ ] Team A name customization
  - [ ] Team B name customization
  - [ ] Team description/theme options
  - [ ] Regional vs. mixed club representation options
- [ ] **Player Selection Method**
  - [ ] Organizer manual selection
  - [ ] Club nomination system
  - [ ] Age-based selection criteria
  - [ ] Balanced team composition rules
- [ ] **Rep Round Integration Preview**
  - [ ] Schedule impact visualization
  - [ ] Time allocation for rep rounds
  - [ ] Regular match scheduling adjustment preview

#### Step 5: Preview and Generate
- [ ] **Configuration Summary**
  - [ ] Masters tournament format confirmation
  - [ ] Intra-club avoidance settings display
  - [ ] Time and scheduling overview
- [ ] **Generate Multiple Draw Options**
  - [ ] Different algorithm variations
  - [ ] Intra-club violation reports
  - [ ] Time distribution analysis
- [ ] **Side-by-Side Comparison**
  - [ ] Masters-specific quality metrics
  - [ ] Same-club matchup warnings
  - [ ] Participant satisfaction scoring

### Draw Management Interface

#### Draw Dashboard
- [ ] **Current Draw Status**
  - [ ] Generation progress and completion
  - [ ] Key metrics and quality scores
  - [ ] Recent changes and updates
- [ ] **Quick Actions**
  - [ ] Regenerate with different settings
  - [ ] Export to various formats
  - [ ] Publish to participants

#### Interactive Draw Viewer
- [ ] **Visual Representation**
  - [ ] Expandable pool and bracket views
  - [ ] Team hover information
  - [ ] Color-coded match status
- [ ] **Editing Capabilities**
  - [ ] Drag-and-drop team reassignment
  - [ ] Manual match scheduling adjustments
  - [ ] Conflict highlighting and resolution

## Multi-Criteria Implementation Details

### Scoring System Architecture

```javascript
// services/draw/MultiCriteriaScorer.mjs
class MultiCriteriaScorer {
  constructor(rules, combinationMethod = 'weighted_sum') {
    this.rules = rules.filter(rule => rule.enabled);
    this.combinationMethod = combinationMethod;
    this.scorers = new Map();
    this.initializeScoringComponents();
  }

  calculateMatchupScore(team1, team2) {
    const scores = {};
    let totalScore = 0;

    // Calculate individual rule scores
    for (const rule of this.rules) {
      const scorer = this.scorers.get(rule.type);
      scores[rule.type] = scorer.scoreMatchup(team1, team2, rule.config);
    }

    // Combine scores based on method
    switch (this.combinationMethod) {
      case 'weighted_sum':
        totalScore = this.calculateWeightedSum(scores);
        break;
      case 'lexicographic':
        totalScore = this.calculateLexicographic(scores);
        break;
      case 'pareto_optimal':
        totalScore = this.calculateParetoScore(scores);
        break;
    }

    return { totalScore, individualScores: scores };
  }

  calculateWeightedSum(scores) {
    return this.rules.reduce((total, rule) => {
      return total + (scores[rule.type] * rule.weight / 100);
    }, 0);
  }
}
```

### Individual Rule Scoring Components

```javascript
// Geographic Distribution Scorer
class GeographicScorer {
  scoreMatchup(team1, team2, config) {
    const distance = this.calculateDistance(team1.location, team2.location);
    
    if (distance < config.min_distance_km) {
      return 0.2; // Low score for local matchups
    } else if (distance > config.ideal_distance_km) {
      return 0.8; // High score for diverse matchups
    }
    
    return 0.5 + (distance / config.ideal_distance_km) * 0.3;
  }
}

// Shorts Matching Scorer - Masters Rugby League Modified Contact Rules
class ShortsMatchingScorer {
  scoreMatchup(team1, team2, config) {
    const team1ModifiedRules = this.countModifiedRulesPlayers(team1);
    const team2ModifiedRules = this.countModifiedRulesPlayers(team2);
    
    // Calculate similarity in modified rules participation
    const totalPlayers1 = team1.players.length;
    const totalPlayers2 = team2.players.length;
    const modifiedRatio1 = team1ModifiedRules / totalPlayers1;
    const modifiedRatio2 = team2ModifiedRules / totalPlayers2;
    
    const ratioSimilarity = 1.0 - Math.abs(modifiedRatio1 - modifiedRatio2);
    
    return Math.max(0.1, ratioSimilarity); // Minimum score for very different compositions
  }
  
  countModifiedRulesPlayers(team) {
    // Count players wearing red (grab/hold), yellow (touch), green (70-79), blue (80+)
    return team.players.filter(player => 
      ['red', 'yellow', 'green', 'blue'].includes(player.shortsColor)
    ).length;
  }
}

// Age Balance Scorer
class AgeBalanceScorer {
  scoreMatchup(team1, team2, config) {
    const team1Ages = this.calculateAgeProfile(team1);
    const team2Ages = this.calculateAgeProfile(team2);
    
    // Calculate age distribution similarity
    const ageSimilarity = this.calculateAgeDistributionSimilarity(team1Ages, team2Ages);
    
    // Calculate average age difference
    const avgAgeDifference = Math.abs(team1Ages.averageAge - team2Ages.averageAge);
    const maxAcceptableDifference = config.age_variance_threshold;
    
    if (avgAgeDifference > maxAcceptableDifference) {
      return Math.max(0.2, ageSimilarity * 0.5); // Reduced score for large age gaps
    }
    
    return ageSimilarity;
  }
  
  calculateAgeProfile(team) {
    const ages = team.players.map(player => player.age);
    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    
    const ageGroups = {
      under_35: ages.filter(age => age < 35).length,
      '35_50': ages.filter(age => age >= 35 && age < 50).length,
      '50_65': ages.filter(age => age >= 50 && age < 65).length,
      over_65: ages.filter(age => age >= 65).length
    };
    
    return { averageAge, ageGroups, totalPlayers: ages.length };
  }
  
  calculateAgeDistributionSimilarity(profile1, profile2) {
    // Calculate similarity between age group distributions
    const groups = ['under_35', '35_50', '50_65', 'over_65'];
    let similarity = 0;
    
    for (const group of groups) {
      const ratio1 = profile1.ageGroups[group] / profile1.totalPlayers;
      const ratio2 = profile2.ageGroups[group] / profile2.totalPlayers;
      const groupSimilarity = 1.0 - Math.abs(ratio1 - ratio2);
      similarity += groupSimilarity;
    }
    
    return similarity / groups.length;
  }
}
```

### Optimization Algorithms

```javascript
// Multi-Objective Optimization Engine
class DrawOptimizer {
  constructor(scorer, teams) {
    this.scorer = scorer;
    this.teams = teams;
  }

  async optimizeDraw(constraints) {
    // Generate initial population of possible draws
    const population = this.generateInitialPopulation();
    
    // Apply genetic algorithm for multi-objective optimization
    for (let generation = 0; generation < constraints.max_iterations; generation++) {
      const scoredPopulation = this.scorePopulation(population);
      const selected = this.selectBest(scoredPopulation);
      const offspring = this.generateOffspring(selected);
      population.splice(0, population.length, ...offspring);
      
      if (this.hasConverged(scoredPopulation, constraints.convergence_threshold)) {
        break;
      }
    }
    
    return this.selectOptimalDraw(population);
  }

  scorePopulation(population) {
    return population.map(draw => ({
      draw,
      scores: this.calculateDrawScore(draw),
      fitness: this.calculateFitness(draw)
    }));
  }

  calculateDrawScore(draw) {
    const matchupScores = [];
    
    for (const match of draw.matches) {
      const score = this.scorer.calculateMatchupScore(
        match.team1, 
        match.team2
      );
      matchupScores.push(score);
    }
    
    return {
      averageScore: matchupScores.reduce((sum, s) => sum + s.totalScore, 0) / matchupScores.length,
      individualRuleAverages: this.calculateRuleAverages(matchupScores),
      standardDeviation: this.calculateStandardDeviation(matchupScores)
    };
  }
}
```

### Configuration Validation

```javascript
// Multi-Criteria Configuration Validator
class ConfigurationValidator {
  static validateSortingRules(rules) {
    const errors = [];
    
    // Check weight totals
    const totalWeight = rules
      .filter(rule => rule.enabled)
      .reduce((sum, rule) => sum + rule.weight, 0);
    
    if (Math.abs(totalWeight - 100) > 0.1) {
      errors.push(`Rule weights must sum to 100, currently ${totalWeight}`);
    }
    
    // Check for conflicting rules
    const enabledRules = rules.filter(rule => rule.enabled);
    if (enabledRules.length === 0) {
      errors.push('At least one sorting rule must be enabled');
    }
    
    // Validate rule-specific configurations
    for (const rule of enabledRules) {
      const ruleErrors = this.validateRuleConfig(rule);
      errors.push(...ruleErrors);
    }
    
    return errors;
  }
  
  static validateRuleConfig(rule) {
    const errors = [];
    
    switch (rule.type) {
      case 'geographic_distribution':
        if (rule.config.min_distance_km < 0) {
          errors.push('Geographic minimum distance must be positive');
        }
        break;
      case 'shorts_matching':
        if (rule.config.similarity_threshold < 0 || rule.config.similarity_threshold > 1) {
          errors.push('Shorts matching similarity threshold must be between 0 and 1');
        }
        break;
      // Additional rule validations...
    }
    
    return errors;
  }
}
```

## Testing Strategy

### Unit Tests
- [ ] **Algorithm Testing**
  - [ ] Each draw generator with various team configurations
  - [ ] Edge cases (odd team numbers, constraints)
  - [ ] Performance testing with large tournaments
- [ ] **Validation Testing**
  - [ ] Configuration validation edge cases
  - [ ] Draw quality verification
  - [ ] Constraint satisfaction testing

### Integration Tests
- [ ] **End-to-End Workflow**
  - [ ] Complete draw generation process
  - [ ] Database integration and persistence
  - [ ] UI interaction and data flow
- [ ] **Algorithm Comparison**
  - [ ] Consistent results across multiple runs
  - [ ] Quality comparisons between algorithms
  - [ ] Performance benchmarking

### User Acceptance Testing
- [ ] **Carnival Organizer Testing**
  - [ ] Real-world tournament scenarios
  - [ ] Usability testing with actual organizers
  - [ ] Feedback integration and iteration
- [ ] **Draw Quality Assessment**
  - [ ] Expert review of generated draws
  - [ ] Comparison with manually created draws
  - [ ] Participant satisfaction surveys

## Security Considerations

### Access Control
- [ ] **Draw Generation Permissions**
  - [ ] Only carnival owners can generate draws
  - [ ] Role-based access for carnival delegates
  - [ ] Read-only access for participants

### Data Protection
- [ ] **Team Information Security**
  - [ ] Secure handling of team registration data
  - [ ] Privacy protection for player information
  - [ ] Audit logging for draw modifications

### Algorithm Integrity
- [ ] **Randomness Quality**
  - [ ] Cryptographically secure random number generation
  - [ ] Bias detection and prevention
  - [ ] Reproducible results for auditing

## Performance Considerations

### Scalability Requirements
- [ ] **Large Tournament Support**
  - [ ] Handle tournaments with 100+ teams
  - [ ] Efficient algorithm performance
  - [ ] Memory usage optimization

### Response Time Targets
- [ ] **Draw Generation Speed**
  - [ ] < 5 seconds for tournaments up to 50 teams
  - [ ] < 30 seconds for tournaments up to 200 teams
  - [ ] Progress indicators for longer operations

### Caching Strategy
- [ ] **Configuration Caching**
  - [ ] Cache frequently used configurations
  - [ ] Optimize repeated draw generation
  - [ ] Invalidation on configuration changes

## Business Value and Success Metrics

### Organizer Benefits
- [ ] **Time Savings**
  - [ ] Reduce draw creation time from hours to minutes
  - [ ] Eliminate manual scheduling conflicts
  - [ ] Automatic optimization for fairness

### Quality Improvements
- [ ] **Draw Fairness**
  - [ ] Measurable improvement in age-appropriate team matching
  - [ ] Reduced scheduling conflicts
  - [ ] Enhanced participant satisfaction

### Platform Growth
- [ ] **Feature Adoption**
  - [ ] >70% of carnivals use automated draw generation within 6 months
  - [ ] Positive feedback scores >4.5/5
  - [ ] Reduced support requests for draw-related issues

## Risk Mitigation

### Technical Risks
- [ ] **Algorithm Complexity**
  - [ ] Start with simple algorithms and iterate
  - [ ] Extensive testing before production deployment
  - [ ] Fallback to manual draw creation if needed

### User Adoption Risks
- [ ] **Change Management**
  - [ ] Gradual rollout with opt-in period
  - [ ] Comprehensive training materials
  - [ ] Direct support for early adopters

### Quality Risks
- [ ] **Draw Acceptance**
  - [ ] Multiple algorithm options for different preferences
  - [ ] Manual override capabilities
  - [ ] Clear explanation of algorithm logic

## Deployment Strategy

### Development Phases
- [ ] **Phase 1** - Local development with synthetic data
- [ ] **Phase 2** - Staging environment with historical carnival data
- [ ] **Phase 3** - Limited beta with select carnival organizers
- [ ] **Phase 4** - Full production rollout

### Rollout Plan
- [ ] **Beta Testing** - 5-10 upcoming carnivals
- [ ] **Feedback Integration** - Algorithm refinement based on beta results
- [ ] **Full Launch** - All new carnivals have access to automated draws
- [ ] **Legacy Support** - Maintain manual draw options for organizer preference

## Documentation Requirements

### Technical Documentation
- [ ] **Algorithm Documentation**
  - [ ] Detailed explanation of each algorithm
  - [ ] Configuration options and their effects
  - [ ] Performance characteristics and limitations
- [ ] **API Documentation**
  - [ ] Draw generation service endpoints
  - [ ] Configuration schema reference
  - [ ] Integration examples for third-party systems

### User Documentation
- [ ] **Organizer Guide**
  - [ ] Step-by-step draw generation process
  - [ ] Algorithm selection recommendations
  - [ ] Troubleshooting common issues
- [ ] **Best Practices Guide**
  - [ ] Tournament format recommendations
  - [ ] Configuration optimization tips
  - [ ] Case studies from successful implementations

## Future Enhancements

### Advanced Multi-Criteria Features (Post-Launch)
- [ ] **Advanced Combination Methods**
  - [ ] Fuzzy logic for rule combination
  - [ ] Neural network-based weight optimization
  - [ ] Context-aware rule prioritization
- [ ] **Dynamic Rule Learning**
  - [ ] Machine learning from historical tournament outcomes
  - [ ] Automatic weight adjustment based on organizer feedback
  - [ ] Predictive modeling for optimal rule combinations
- [ ] **Custom Rule Development**
  - [ ] Plugin system for user-defined scoring rules
  - [ ] Visual rule builder interface
  - [ ] Community-shared rule templates

### Real-Time Multi-Criteria Optimization
- [ ] **Live Draw Adjustments**
  - [ ] Dynamic rescheduling for weather delays
  - [ ] Automatic handling of team withdrawals
  - [ ] Real-time re-optimization with updated constraints
- [ ] **Adaptive Scoring**
  - [ ] Context-sensitive rule weights (time of day, weather, etc.)
  - [ ] Historical performance impact analysis
  - [ ] Crowd preference integration

### Cross-Tournament Multi-Criteria Analysis
- [ ] **Circuit-Wide Optimization**
  - [ ] Multi-tournament age-based team balancing
  - [ ] Regional travel cost minimization across events
  - [ ] Season-long fairness metrics
- [ ] **Comparative Analytics**
  - [ ] Rule effectiveness across different tournament types
  - [ ] Multi-criteria performance benchmarking
  - [ ] Best practice recommendation engine

### Integration Opportunities
- [ ] **Enhanced MySideline Integration**
  - [ ] Real-time team strength ratings
  - [ ] Player availability and injury status
  - [ ] Historical performance data
- [ ] **External System Integration**
  - [ ] Live streaming coordination
  - [ ] Referee assignment systems
  - [ ] Catering and logistics optimization

---

## Validation and Error Handling

### Rep Rounds Validation

#### Configuration Validation
- [ ] **Rep Rounds Enable Check**
  - [ ] Validate enable_rep_rounds boolean value
  - [ ] Cross-check with carnival day configuration
  - [ ] Ensure compatibility with fixed games format
- [ ] **Frequency Validation**
  - [ ] Validate rep_rounds_per_day (0-3 range typical)
  - [ ] Check total rep rounds against available time slots
  - [ ] Verify impact on regular match scheduling
- [ ] **Timing Validation**  
  - [ ] Validate rep_round_timing enum values (start_of_day, mid_day, end_of_day)
  - [ ] Check timing compatibility with carnival schedule
  - [ ] Ensure adequate break time before/after rep rounds
- [ ] **Duration Validation**
  - [ ] Validate rep_round_duration_minutes (positive integer)
  - [ ] Check against total available time per day
  - [ ] Ensure consistency with regular match duration if not specified

#### Data Integrity Validation
- [ ] **Team Name Validation**
  - [ ] Validate rep team names are not empty/null
  - [ ] Check for duplicate team names within rep rounds
  - [ ] Ensure names don't conflict with regular team names
- [ ] **Selection Method Validation**
  - [ ] Validate rep_round_selection_method enum values
  - [ ] Cross-check with available player data
  - [ ] Verify organizer permissions for manual selection
- [ ] **Player Assignment Validation**
  - [ ] Check RepRoundPlayer foreign key constraints
  - [ ] Validate player availability for rep rounds
  - [ ] Ensure no player double-booking conflicts

#### Scheduling Integration Validation
- [ ] **Time Conflict Detection**
  - [ ] Check rep round timing against regular matches
  - [ ] Validate 5-minute break requirements around rep rounds
  - [ ] Ensure no scheduling overlaps on multi-field setups
- [ ] **Resource Validation**
  - [ ] Verify field availability for rep rounds
  - [ ] Check referee/official assignments
  - [ ] Validate equipment and logistics requirements

### Error Handling Strategies

#### Rep Rounds Generation Errors
- [ ] **Configuration Errors**
  - [ ] Handle invalid rep rounds configuration gracefully
  - [ ] Provide clear error messages for invalid timing settings
  - [ ] Offer fallback options when rep rounds can't be scheduled
- [ ] **Scheduling Conflicts**
  - [ ] Detect and resolve rep round timing conflicts
  - [ ] Automatic rescheduling suggestions
  - [ ] Manual intervention options for organizers
- [ ] **Data Errors**
  - [ ] Handle missing or invalid rep team information
  - [ ] Graceful degradation when player selection fails
  - [ ] Rollback options for failed rep round generation

#### User Experience Error Handling
- [ ] **Validation Feedback**
  - [ ] Real-time validation in rep rounds configuration UI
  - [ ] Clear error messaging with suggested fixes
  - [ ] Progressive validation during wizard steps
- [ ] **Recovery Options**
  - [ ] Save partial rep rounds configuration for later completion
  - [ ] Quick fixes for common configuration errors
  - [ ] Alternative scheduling suggestions when conflicts occur

#### System Error Handling
- [ ] **Database Errors**
  - [ ] Handle RepRoundTeam/RepRoundPlayer creation failures
  - [ ] Transaction rollback for incomplete rep rounds setup
  - [ ] Data consistency checks after rep rounds generation
- [ ] **Algorithm Errors**
  - [ ] Fallback algorithms when rep rounds integration fails
  - [ ] Graceful degradation to regular match generation only
  - [ ] Detailed error logging for debugging rep rounds issues

---

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1: Core Engine** | 2-3 weeks | Basic draw generation, random algorithm, admin interface |
| **Phase 2: Advanced Algorithms** | 3-4 weeks | Intelligent matching, visualization, export features |
| **Phase 3: Enhanced Features** | 2-3 weeks | Historical analysis, dynamic adjustments, integrations |
| **Phase 4: Analytics** | 1-2 weeks | Performance metrics, optimization features |
| **Total** | **8-12 weeks** | Complete automated draw creation system |

## Next Steps

1. **[ ] Stakeholder Review and Approval** - Present plan to carnival organizers for feedback
2. **[ ] Technical Architecture Review** - Validate proposed service design and database schema
3. **[ ] UI/UX Design Phase** - Create mockups and wireframes for draw management interface
4. **[ ] Beta Tester Recruitment** - Identify carnival organizers willing to participate in beta testing
5. **[ ] Development Environment Setup** - Configure development tools and testing frameworks
6. **[ ] Begin Phase 1 Development** - Start with core draw generation service implementation

---

*This plan builds upon the existing Old Man Footy platform infrastructure and maintains consistency with the current MVC architecture, security practices, and user experience patterns.*

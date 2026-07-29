package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"labirynths/internal/models"
)

type Store struct {
	mu       sync.RWMutex
	filePath string
	profiles map[string]*models.Profile
}

func NewStore(dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	fp := filepath.Join(dataDir, "profiles.json")
	store := &Store{
		filePath: fp,
		profiles: make(map[string]*models.Profile),
	}

	if err := store.load(); err != nil {
		if os.IsNotExist(err) {
			store.createDefaults()
			_ = store.save()
		} else {
			return nil, fmt.Errorf("error loading profiles: %w", err)
		}
	}

	return store, nil
}

func (s *Store) createDefaults() {
	def1 := &models.Profile{
		ID:           "prof_magic",
		Name:         "Fairy Star",
		Avatar:       "unicorn",
		Theme:        "magic",
		TotalSolved:  0,
		StoryProgress: models.StoryProgress{
			TotalStars:      0,
			UnlockedChapter: 1,
			UnlockedLevel:   1,
			LevelStars:      make(map[string]int),
			LevelScores:     make(map[string]models.LevelRecord),
		},
		MazeRecords: make(map[string]models.Record),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	def2 := &models.Profile{
		ID:           "prof_space",
		Name:         "Space Explorer",
		Avatar:       "rocket",
		Theme:        "space",
		TotalSolved:  0,
		StoryProgress: models.StoryProgress{
			TotalStars:      0,
			UnlockedChapter: 1,
			UnlockedLevel:   1,
			LevelStars:      make(map[string]int),
			LevelScores:     make(map[string]models.LevelRecord),
		},
		MazeRecords: make(map[string]models.Record),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	s.profiles[def1.ID] = def1
	s.profiles[def2.ID] = def2
}

func (s *Store) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	var list []*models.Profile
	if err := json.Unmarshal(data, &list); err != nil {
		return err
	}

	s.profiles = make(map[string]*models.Profile)
	for _, p := range list {
		if p.StoryProgress.LevelStars == nil {
			p.StoryProgress.LevelStars = make(map[string]int)
		}
		if p.StoryProgress.LevelScores == nil {
			p.StoryProgress.LevelScores = make(map[string]models.LevelRecord)
		}
		if p.MazeRecords == nil {
			p.MazeRecords = make(map[string]models.Record)
		}
		s.profiles[p.ID] = p
	}
	return nil
}

func (s *Store) save() error {
	list := make([]*models.Profile, 0, len(s.profiles))
	for _, p := range s.profiles {
		list = append(list, p)
	}

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}

func (s *Store) GetAllProfiles() []*models.Profile {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]*models.Profile, 0, len(s.profiles))
	for _, p := range s.profiles {
		list = append(list, p)
	}
	return list
}

func (s *Store) GetProfile(id string) (*models.Profile, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	p, ok := s.profiles[id]
	return p, ok
}

func (s *Store) CreateProfile(name, avatar, theme string) (*models.Profile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("prof_%d", time.Now().UnixNano())
	if theme == "" {
		theme = "magic"
	}
	if avatar == "" {
		avatar = "unicorn"
	}

	p := &models.Profile{
		ID:           id,
		Name:         name,
		Avatar:       avatar,
		Theme:        theme,
		TotalSolved:  0,
		StoryProgress: models.StoryProgress{
			TotalStars:      0,
			UnlockedChapter: 1,
			UnlockedLevel:   1,
			LevelStars:      make(map[string]int),
			LevelScores:     make(map[string]models.LevelRecord),
		},
		MazeRecords: make(map[string]models.Record),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	s.profiles[id] = p
	if err := s.save(); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Store) UpdateProfile(id string, name, avatar, theme string) (*models.Profile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.profiles[id]
	if !ok {
		return nil, fmt.Errorf("profile not found: %s", id)
	}

	if name != "" {
		p.Name = name
	}
	if avatar != "" {
		p.Avatar = avatar
	}
	if theme != "" {
		p.Theme = theme
	}
	p.UpdatedAt = time.Now()

	if err := s.save(); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Store) RecordSolve(payload models.MazeSolvePayload) (*models.Profile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.profiles[payload.ProfileID]
	if !ok {
		return nil, fmt.Errorf("profile not found: %s", payload.ProfileID)
	}

	p.TotalSolved++
	p.TotalMoves += payload.Moves
	p.TotalTimeSec += payload.TimeSec
	p.TotalResets += payload.Resets
	p.UpdatedAt = time.Now()

	if payload.Mode == "story" {
		levelKey := fmt.Sprintf("ch%d_lvl%d", payload.Chapter, payload.Level)
		
		stars := 1
		if payload.ItemsTotal > 0 {
			ratio := float64(payload.ItemsGot) / float64(payload.ItemsTotal)
			if ratio >= 1.0 {
				stars = 3
			} else if ratio >= 0.5 {
				stars = 2
			} else {
				stars = 1
			}
		} else {
			stars = 3
		}

		oldStars := p.StoryProgress.LevelStars[levelKey]
		if stars > oldStars {
			p.StoryProgress.LevelStars[levelKey] = stars
			total := 0
			for _, st := range p.StoryProgress.LevelStars {
				total += st
			}
			p.StoryProgress.TotalStars = total
		}

		p.StoryProgress.LevelScores[levelKey] = models.LevelRecord{
			Stars:          stars,
			Moves:          payload.Moves,
			TimeSec:        payload.TimeSec,
			ItemsCollected: payload.ItemsGot,
			TotalItems:     payload.ItemsTotal,
			CompletedAt:    time.Now(),
		}

		if payload.Level >= p.StoryProgress.UnlockedLevel && payload.Chapter == p.StoryProgress.UnlockedChapter {
			if payload.Level < 10 {
				p.StoryProgress.UnlockedLevel = payload.Level + 1
			} else {
				if p.StoryProgress.TotalStars >= p.StoryProgress.UnlockedChapter*25 {
					p.StoryProgress.UnlockedChapter++
					p.StoryProgress.UnlockedLevel = 1
				}
			}
		}
	} else {
		recKey := payload.MazeID
		existing, ok := p.MazeRecords[recKey]
		if !ok {
			p.MazeRecords[recKey] = models.Record{
				BestMoves:   payload.Moves,
				BestTime:    payload.TimeSec,
				Resets:      payload.Resets,
				TimesPlayed: 1,
			}
		} else {
			existing.TimesPlayed++
			existing.Resets += payload.Resets
			if payload.Moves < existing.BestMoves || existing.BestMoves == 0 {
				existing.BestMoves = payload.Moves
			}
			if payload.TimeSec < existing.BestTime || existing.BestTime == 0 {
				existing.BestTime = payload.TimeSec
			}
			p.MazeRecords[recKey] = existing
		}
	}

	if err := s.save(); err != nil {
		return nil, err
	}

	return p, nil
}

func (s *Store) DeleteProfile(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.profiles, id)
	return s.save()
}

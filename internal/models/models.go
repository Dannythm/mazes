package models

import "time"

// Profile represents a child or user playing the game.
type Profile struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Avatar        string            `json:"avatar"`        // e.g. "unicorn", "fairy", "rocket", "dino", "car"
	Theme         string            `json:"theme"`         // "magic" or "space"
	TotalSolved   int               `json:"total_solved"`
	TotalMoves    int               `json:"total_moves"`
	TotalTimeSec  float64           `json:"total_time_sec"`
	TotalResets   int               `json:"total_resets"`
	StoryProgress StoryProgress     `json:"story_progress"`
	MazeRecords   map[string]Record `json:"maze_records"`  // Record by maze seed/type
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// StoryProgress tracks chapter, level and star unlocks.
type StoryProgress struct {
	TotalStars      int                    `json:"total_stars"`
	UnlockedChapter int                    `json:"unlocked_chapter"` // 1, 2, 3...
	UnlockedLevel   int                    `json:"unlocked_level"`   // Level 1-10 inside chapter
	LevelStars      map[string]int         `json:"level_stars"`     // "ch1_lvl1" -> stars (1..3)
	LevelScores     map[string]LevelRecord `json:"level_scores"`
}

// LevelRecord records stats for a completed level.
type LevelRecord struct {
	Stars          int       `json:"stars"`
	Moves          int       `json:"moves"`
	TimeSec        float64   `json:"time_sec"`
	ItemsCollected int       `json:"items_collected"`
	TotalItems     int       `json:"total_items"`
	CompletedAt    time.Time `json:"completed_at"`
}

// Record holds highscore stats for a custom maze type.
type Record struct {
	BestMoves   int     `json:"best_moves"`
	BestTime    float64 `json:"best_time"`
	Resets      int     `json:"resets"`
	TimesPlayed int     `json:"times_played"`
}

// MazeSolvePayload is sent when a player solves a maze.
type MazeSolvePayload struct {
	ProfileID  string  `json:"profile_id"`
	MazeID     string  `json:"maze_id"`
	Mode       string  `json:"mode"` // "custom" or "story"
	Chapter    int     `json:"chapter,omitempty"`
	Level      int     `json:"level,omitempty"`
	Moves      int     `json:"moves"`
	TimeSec    float64 `json:"time_sec"`
	Resets     int     `json:"resets"`
	ItemsGot   int     `json:"items_got,omitempty"`
	ItemsTotal int     `json:"items_total,omitempty"`
}

// CreateProfilePayload is sent when creating a new profile.
type CreateProfilePayload struct {
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
	Theme  string `json:"theme"`
}

// UpdateProfilePayload is sent when editing an existing profile name/avatar/theme.
type UpdateProfilePayload struct {
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
	Theme  string `json:"theme"`
}

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"labirynths/internal/models"
	"labirynths/internal/storage"
)

func getLocalIPs() []string {
	var ips []string
	ifaces, err := net.Interfaces()
	if err != nil {
		return ips
	}
	for _, i := range ifaces {
		if i.Flags&net.FlagUp == 0 || i.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := i.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			ip = ip.To4()
			if ip == nil {
				continue
			}
			ips = append(ips, ip.String())
		}
	}
	return ips
}

func printQR(portStr string) {
	fmt.Printf("\n=======================================================\n")
	fmt.Printf("   🧩 KID MAZE EXPLORER - SERVER STARTED 🧩\n")
	fmt.Printf("=======================================================\n\n")

	fmt.Printf(" Open in Browser on Host PC:\n   -> http://localhost%s/maze\n\n", portStr)
	fmt.Printf(" Access on iPad / Local Network:\n")
	ips := getLocalIPs()
	if len(ips) > 0 {
		for _, ip := range ips {
			fmt.Printf("   -> http://%s%s/maze\n", ip, portStr)
		}
	} else {
		fmt.Printf("   -> http://<YOUR-PC-IP>%s/maze\n", portStr)
	}

	fmt.Printf("\n=======================================================\n")
	fmt.Printf(" Tip: Scan or open the link above on your iPad!\n")
	fmt.Printf("=======================================================\n\n")
}

func main() {
	execDir, err := os.Getwd()
	if err != nil {
		execDir = "."
	}

	dataDir := filepath.Join(execDir, "data")
	store, err := storage.NewStore(dataDir)
	if err != nil {
		log.Fatalf("Failed to initialize profile store: %v", err)
	}

	webDir := filepath.Join(execDir, "web")
	fs := http.FileServer(http.Dir(webDir))

	handleProfiles := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method == http.MethodGet {
			profiles := store.GetAllProfiles()
			_ = json.NewEncoder(w).Encode(profiles)
			return
		}

		if r.Method == http.MethodPost {
			var payload models.CreateProfilePayload
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			p, err := store.CreateProfile(payload.Name, payload.Avatar, payload.Theme)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			_ = json.NewEncoder(w).Encode(p)
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	handleProfileID := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		id := strings.TrimPrefix(r.URL.Path, "/api/profiles/")
		id = strings.TrimPrefix(id, "maze/api/profiles/")
		if id == "" {
			http.Error(w, "Missing profile ID", http.StatusBadRequest)
			return
		}

		if r.Method == http.MethodGet {
			p, ok := store.GetProfile(id)
			if !ok {
				http.Error(w, "Profile not found", http.StatusNotFound)
				return
			}
			_ = json.NewEncoder(w).Encode(p)
			return
		}

		if r.Method == http.MethodPut {
			var payload models.UpdateProfilePayload
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			updated, err := store.UpdateProfile(id, payload.Name, payload.Avatar, payload.Theme)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			_ = json.NewEncoder(w).Encode(updated)
			return
		}

		if r.Method == http.MethodDelete {
			if err := store.DeleteProfile(id); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	handleSolve := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var payload models.MazeSolvePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		updatedProf, err := store.RecordSolve(payload)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		_ = json.NewEncoder(w).Encode(updatedProf)
	}

	// API routes
	http.HandleFunc("/api/profiles", handleProfiles)
	http.HandleFunc("/maze/api/profiles", handleProfiles)

	http.HandleFunc("/api/profiles/", handleProfileID)
	http.HandleFunc("/maze/api/profiles/", handleProfileID)

	http.HandleFunc("/api/solve", handleSolve)
	http.HandleFunc("/maze/api/solve", handleSolve)

	// Web routes
	http.Handle("/maze/", http.StripPrefix("/maze", fs))
	http.HandleFunc("/maze", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/maze/", http.StatusFound)
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.Redirect(w, r, "/maze/", http.StatusFound)
			return
		}
		fs.ServeHTTP(w, r)
	})

	port := ":8080"
	listener, err := net.Listen("tcp", "0.0.0.0"+port)
	if err != nil {
		log.Fatalf("Server failed to bind listener: %v", err)
	}

	printQR(port)
	if err := http.Serve(listener, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

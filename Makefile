PHONEY: start


start: 
	docker compose up -d && pnpm dev && docker compose down
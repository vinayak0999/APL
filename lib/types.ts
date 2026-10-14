export type Gender = "M" | "F";
export type PlayerStatus = "available" | "sold" | "unsold";
export type AuctionStatus = "setup" | "live" | "paused" | "done";
export type LotStatus = "idle" | "open" | "sold" | "unsold";

export interface Auction {
  id: number;
  name: string;
  budget_per_team: number;
  squad_size: number;
  base_price: number;
  bid_increment: number;
  min_females_per_team: number;
  status: AuctionStatus;
  current_player_id: string | null;
  current_bid: number | null;
  current_bidder_team: string | null;
  lot_status: LotStatus;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  pin: string;
  logo_url: string | null;
  captain_id: string | null;
  vice_captain_id: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  base_price: number;
  skill: string | null;
  skill_level: string | null;
  status: PlayerStatus;
  sold_team: string | null;
  sold_price: number | null;
  created_at: string;
}

export interface TeamStanding {
  id: string;
  name: string;
  pin: string;
  logo_url: string | null;
  captain_id: string | null;
  vice_captain_id: string | null;
  spent: number;
  remaining: number;
  squad_count: number;
  female_count: number;
  male_count: number;
}

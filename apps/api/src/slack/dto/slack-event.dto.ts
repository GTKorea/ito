export class SlackEventDto {
  token?: string;
  type: string;
  challenge?: string;
  team_id?: string;
  event?: {
    type: string;
    user?: string;
    channel?: string;
    text?: string;
    ts?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

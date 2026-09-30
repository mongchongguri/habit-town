import { ImageSourcePropType } from 'react-native';
import { GrowthStage } from '../../features/rewards/rewardSystem';

export type { GrowthStage };

export type RailAction = {
  badge?: string;
  id: string;
  image?: ImageSourcePropType;
  label: string;
  onPress?: () => void;
  symbol: string;
};

export type RailMetrics = {
  buttonWidth: number;
  gap: number;
  iconSize: number;
  labelFontSize: number;
};

export type PetDefinition = {
  id: 'cat' | 'hamster' | 'dog';
  name: string;
  profileStages?: Partial<Record<GrowthStage, ImageSourcePropType>>;
  roomName: string;
  stages: Record<GrowthStage, ImageSourcePropType>;
};

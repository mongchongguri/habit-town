import { PetDefinition, RailAction } from './types';

export const leftActions: RailAction[] = [
  {
    id: 'todayTasks',
    image: require('../../../assets/images/icons/navigation/today-tasks-button-simple.png'),
    label: 'Today',
    symbol: '!',
  },
  {
    id: 'yearlyGoal',
    image: require('../../../assets/images/icons/navigation/yearly-goals-button-simple.png'),
    label: 'Goal',
    symbol: 'Y',
  },
  {
    id: 'calendar',
    image: require('../../../assets/images/icons/navigation/calendar-button-simple.png'),
    label: 'Calendar',
    symbol: 'C',
  },
  {
    id: 'shop',
    image: require('../../../assets/images/icons/navigation/shop-button-simple.png'),
    label: 'Shop',
    symbol: '$',
  },
];

export const rightActions: RailAction[] = [
  { id: 'gift', image: require('../../../assets/images/icons/navigation/reward-button-simple.png'), label: 'Gift', symbol: 'G' },
  { id: 'inventory', image: require('../../../assets/images/icons/navigation/inventory-button-simple.png'), label: 'Bag', symbol: 'I' },
];

export const pets: PetDefinition[] = [
  {
    id: 'cat',
    name: 'Cat',
    profileStages: {
      baby: require('../../../assets/png/animals/profile/cat-baby-profile.png'),
    },
    roomName: "Cat's Room",
    stages: {
      adult: require('../../../assets/png/animals/cat-adult.png'),
      baby: require('../../../assets/png/animals/cat-baby.png'),
      child: require('../../../assets/png/animals/cat-child.png'),
      teen: require('../../../assets/png/animals/cat-teen.png'),
    },
  },
  {
    id: 'hamster',
    name: 'Hamster',
    profileStages: {
      baby: require('../../../assets/png/animals/profile/hamster-baby-profile.png'),
    },
    roomName: "Hamster's Room",
    stages: {
      adult: require('../../../assets/png/animals/hamster-adult.png'),
      baby: require('../../../assets/png/animals/hamster-baby.png'),
      child: require('../../../assets/png/animals/hamster-child.png'),
      teen: require('../../../assets/png/animals/hamster-teen.png'),
    },
  },
  {
    id: 'dog',
    name: 'Dog',
    profileStages: {
      baby: require('../../../assets/png/animals/profile/dog-baby-profile.png'),
    },
    roomName: "Dog's Room",
    stages: {
      adult: require('../../../assets/png/animals/dog-adult.png'),
      baby: require('../../../assets/png/animals/dog-baby.png'),
      child: require('../../../assets/png/animals/dog-child.png'),
      teen: require('../../../assets/png/animals/dog-teen.png'),
    },
  },
];

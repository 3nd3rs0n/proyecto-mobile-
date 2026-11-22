import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { formatAddress } from '../domain/task-location';
import {
  createCameraService,
  type CameraGateway,
  type PickerResult,
} from '../services/camera-service';
import {
  createLocationService,
  type Coordinates,
  type LocationGateway,
} from '../services/location-service';
import { createPermissionService } from '../services/permission-service';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };

function toPickerResult(result: ImagePicker.ImagePickerResult): PickerResult {
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return { canceled: true };
  return { canceled: false, photo: { uri: asset.uri, width: asset.width, height: asset.height } };
}

function toCoordinates({ coords, timestamp }: Location.LocationObject): Coordinates {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    timestamp,
  };
}

const cameraGateway: CameraGateway = {
  launchCamera: async () => toPickerResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS)),
  launchLibrary: async () =>
    toPickerResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)),
};

const locationGateway: LocationGateway = {
  servicesEnabled: () => Location.hasServicesEnabledAsync(),
  getCurrent: async () =>
    toCoordinates(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })),
  async getLastKnown() {
    const last = await Location.getLastKnownPositionAsync();
    return last ? toCoordinates(last) : null;
  },
  async reverseGeocode({ latitude, longitude }) {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return address ? formatAddress([address.street, address.district, address.city]) : null;
  },
};

const permissionService = createPermissionService({
  gateways: {
    camera: {
      check: () => ImagePicker.getCameraPermissionsAsync(),
      request: () => ImagePicker.requestCameraPermissionsAsync(),
    },
    location: {
      check: () => Location.getForegroundPermissionsAsync(),
      request: () => Location.requestForegroundPermissionsAsync(),
    },
  },
  openSettings: () => Linking.openSettings(),
});

const cameraService = createCameraService({
  camera: cameraGateway,
  permissions: permissionService,
});

const locationService = createLocationService({
  location: locationGateway,
  permissions: permissionService,
  timeoutMs: 10_000,
  now: Date.now,
});

export const deviceServices = {
  camera: cameraService,
  location: locationService,
  permissions: permissionService,
};

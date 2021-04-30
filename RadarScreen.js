import React, {FunctionComponent, useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ImageRequireSource,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {appStyles, primaryColor} from '../styles/styles';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import ButtonIndicator from '../components/Buttons/ButtonIndicator';
import Slider from '@react-native-community/slider';
import MapView, {PROVIDER_GOOGLE, UrlTile, Marker} from 'react-native-maps';
import {StoreState} from '../reducers';
import {UserReducer} from '../reducers/userReducer';
import {connect} from 'react-redux';
import {appAlertMessage, GOOGLE_PLACE_API, testCoords} from '../utils/constant';
import axios from 'axios';
import {DEV, GET_WEATHER_IMAGERY, GET_WEATHER_TS} from '../constants/apis';
import {useFocusEffect} from '@react-navigation/native';
import moment from 'moment';
import {AppReducer} from '../reducers/appReducer';
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from 'react-native-google-places-autocomplete';
import {Address} from './HomeScreen';

interface MapImagesDataProps {
  source: ImageRequireSource;
}

interface RadarScreenProps {
  userReducer: UserReducer;
  appReducer: AppReducer;
}

const RadarScreen: FunctionComponent<RadarScreenProps> = (props) => {
  let rAnimFrame;
  const {navigation, userReducer, appReducer} = props;
  const {userDetails, userData, loggedIn} = userReducer;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoom, setZoom] = useState(0);
  const [tileOpacity, setTileOpacity] = useState(0);
  const [maxZoom, setMaxZoom] = useState<null | number>(null);
  const [series, setSeries] = useState([]);
  const [tileUrl, setTileUrl] = useState('');
  const [searchAddress, setSearchAddress] = useState<Address | null>(null);

  const [currImageIndex, setcurrImageIndex] = useState<number>(0);
  const [intervalId, setIntervalId] = useState(null);
  const [playingWeather, setPlayingWeather] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: DEV ? testCoords.lat : appReducer.currLocationCoords!.lat,
    longitude: DEV ? testCoords.lng : appReducer.currLocationCoords!.lng,
  });

  const [region, setRegion] = useState({
    latitude: DEV ? testCoords.lat : appReducer.currLocationCoords!.lat,
    longitude: DEV ? testCoords.lng : appReducer.currLocationCoords!.lng,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });


  // update the opacity on tile URl change
  useEffect(() => {
    runOpacityTransition();
  }, [tileUrl]);

  const playWeather = () => {
    setPlayingWeather(true);
    let currIndex = currImageIndex;
    let time = 1;

    if (time >= series.length) {
      // setPlayingWeather(false);
    } else {
      setPlayingWeather(true);
      const interval = setInterval(() => {
        setIntervalId(interval);
        if (currIndex < series.length) {
          // update the opacity to zero
          setTileOpacity(0);

          onTimeSliceChange(series[currIndex]);

          currIndex = currIndex + 1;
          time = time + 1;
          setcurrImageIndex(currIndex);
        } else {
          currIndex = 0;
          time = 1;
          setcurrImageIndex(0);

          setTileOpacity(0);
          onTimeSliceChange(series[currIndex]);
        }
      }, 1500);
    }
  };

  // const playWeather = () => {
  //   const interval = setInterval(() => {
  //     setIntervalId(interval);
  //     if (currImageIndex < series.length) {
  //       onTimeSliceChange(series[currImageIndex]);
  //       // console.log(series[currImageIndex]);
  //       // console.log(series);
  //       // currImageIndex = currImageIndex + 1;
  //       // time = time + 1;
  //       setcurrImageIndex(currImageIndex + 1);
  //     } else {
  //       // setPlayingWeather(false);
  //       clearInterval(interval);
  //       playWeather();
  //     }
  //   }, 1000);
  // };

  const pauseWeather = () => {
    setPlayingWeather(false);
    clearInterval(intervalId);
  };

  useFocusEffect(
    useCallback(() => {
      fetchTimeSlice();
    }, []),
  );

  const fetchTimeSlice = async () => {
    try {
      const {data} = await axios.get(GET_WEATHER_TS);
      const {
        seriesInfo: {precip24hr},
      } = data;
      const {series} = precip24hr;
      let initialTimeSlice = series[0].ts;
      let tileUrl = `${GET_WEATHER_IMAGERY}?timestamp=${initialTimeSlice}&xyz=148:193:9`;

      console.log(`Tile url in fetch Time Slice: ${tileUrl}`)
      setMaxZoom(precip24hr.maxzoom);
      setSeries(series.reverse());
      setTileUrl(tileUrl);
      setZoom(precip24hr.nativeZoom);
      setLoading(false);
    } catch (error) {
      //console.log(error, 'error_fetching_ts');
      setLoading(false);
    }
  };

  const onTimeSliceChange = (time: {ts: number}) => {
    if (time) {
      let initialTimeSlice = time.ts;

      let tileUrl = `${GET_WEATHER_IMAGERY}?timestamp=${initialTimeSlice}&xyz={x}:{y}:{z}`;
      console.log(`Tile url in on Time Slice Change: ${tileUrl}`)

      setTileUrl(tileUrl);
    }
  };

  // add a transition effect to the layer opacity
  const runOpacityTransition = () => {
    let start = performance.now();
    let duration = 750;
  
    rAnimFrame = requestAnimationFrame(function animate(time) {
      // timeFraction goes from 0 to 1
      let timeFraction = (time - start) / duration;
      if (timeFraction > 1) timeFraction = 1;
  
      // calculate the current animation state
      let progress = timeFraction;
  
      // update opacity
      setTileOpacity(progress);

      // cancel the animation frame
      if(progress == 1) {
          cancelAnimationFrame(rAnimFrame);
      }
      
      // rerun if the value is less than 1
      if (timeFraction < 1) {
        rAnimFrame = requestAnimationFrame(animate);
      }
  
    });
  }

  console.log("Tile Opacity: " + tileOpacity);
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  } else {
    return (
      <ScrollView
        keyboardShouldPersistTaps="always"
        style={styles.container}
        contentContainerStyle={{flexGrow: 1}}>
        <View style={styles.headerContainer}>
          <Text style={[appStyles.headerOneStyle]}>Radar</Text>
          <View style={{position: 'relative', marginVertical: 20}}>
            <GooglePlacesAutocomplete
              placeholder="Search by city or ZIP"
              onPress={(data, details = null) => {
                if (details) {
                  setSearchAddress({
                    formatedAddress: details.formatted_address,
                    location: details.geometry.location,
                    description: 'Home',
                  });

                  setRegion({
                    latitude: details.geometry.location.lat,
                    longitude: details.geometry.location.lng,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  });

                  setZoom(Math.round(Math.log(360 / 0.0421) / Math.LN2))
                }
              }}
              query={{
                key: GOOGLE_PLACE_API,
                language: 'en',
              }}
              styles={{
                textInput: [styles.textInputStyle],
              }}
              fetchDetails
              textInputProps={{
                multiline: true,
                numberOfLines: 2,
              }}
            />
            <FontAwesome
              name="search"
              color="#8F8F8F"
              size={18}
              style={{
                position: 'absolute',
                right: 20,
                top: '26%',
              }}
            />
          </View>
          <View style={styles.buttonIndicatorsContainer}>
            <ButtonIndicator
              text="Home"
              iconName="home"
              onPress={() => {
                if (!loggedIn) {
                  navigation.navigate('LoginScreen');
                }

                if (userData?.homeAddress) {
                  setRegion({
                    latitude: userData.homeAddress.location?.lat,
                    longitude: userData.homeAddress.location?.lng,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  });
                  setZoom(Math.round(Math.log(360 / 0.0421) / Math.LN2))
                }
              }}
            />
            <ButtonIndicator
              text="Work"
              iconName="briefcase"
              iconSize={16}
              customStyle={{marginHorizontal: 15}}
              onPress={() => {
                if (!loggedIn) {
                  navigation.navigate('LoginScreen');
                }

                if (userData?.workAddress) {
                  setRegion({
                    latitude: userData.workAddress.location?.lat,
                    longitude: userData.workAddress.location?.lng,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  });
                  setZoom(Math.round(Math.log(360 / 0.0421) / Math.LN2))
                }
              }}
            />
          </View>
        </View>
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            onRegionChangeComplete={(newRegion) => {
              setRegion(newRegion);
              setZoom(Math.round(Math.log(360 / newRegion.longitudeDelta) / Math.LN2))
            }}
            region={region}
            initialRegion={region}
            style={styles.map}
            maxZoomLevel={maxZoom === null ? undefined : maxZoom}
            minZoomLevel={zoom}
            showsUserLocation={true}
            // region={{
            //   ...coords!,
            //   latitudeDelta: 0.015,
            //   longitudeDelta: 0.0121,
            // }}>
          >
            {/* <Marker coordinate={coords} /> */}
            {userData?.homeAddress?.location && (
              <Marker
                coordinate={{
                  latitude: userData?.homeAddress?.location.lat,
                  longitude: userData?.homeAddress?.location.lng,
                }}
              />
            )}
            {userData?.workAddress?.location && (
              <Marker
                coordinate={{
                  latitude: userData?.workAddress?.location.lat,
                  longitude: userData?.workAddress?.location.lng,
                }}
              />
            )}
            <UrlTile
              urlTemplate={tileUrl}
              maximumZ={maxZoom === null ? undefined : maxZoom}
              minimumZ={zoom}
              opacity={tileOpacity}
              zIndex={1}
            />
          </MapView>
        </View>

        <View style={styles.weatherNavContainer}>
          {!playingWeather ? (
            <TouchableOpacity
              style={styles.playContainer}
              disabled={playingWeather}
              onPress={() => playWeather()}>
              <FontAwesome name="play-circle" color={primaryColor} size={35} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.playContainer}
              // disabled={playingWeather}
              onPress={() => pauseWeather()}>
              <FontAwesome name="pause-circle" color={primaryColor} size={35} />
            </TouchableOpacity>
          )}
          <View style={styles.sliderContainer}>
            <View style={[styles.indicatorTextContainer, {marginBottom: -8}]}>
              {series[0] &&
                series.map((value, index) => {
                  return (
                    <Text key={`${index}`} style={styles.indicatorText}>
                      {moment.unix(value.ts).format('h:mm')}
                    </Text>
                  );
                })}
            </View>

            <Slider
              style={{width: '100%', height: 40}}
              minimumValue={1}
              maximumValue={series.length}
              minimumTrackTintColor="#D0D0D0"
              maximumTrackTintColor="#D0D0D0"
              thumbTintColor="#707070"
              step={1}
              onValueChange={(val) => {
                setcurrImageIndex(val);
                onTimeSliceChange(series[val - 1]);
              }}
              value={currImageIndex}
              disabled={playingWeather}
            />
            <View
              style={[
                styles.indicatorTextContainer,
                {
                  justifyContent: 'space-between',
                  marginHorizontal: 16,
                  marginTop: -25,
                },
              ]}>
              {series[0] &&
                series.map((value, index) => {
                  return (
                    <View
                      key={`${index}`}
                      style={{
                        height: 10,
                        width: 1.5,
                        backgroundColor: '#707070',
                      }}
                    />
                  );
                })}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#EBEBEB',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  searchContainer: {
    borderRadius: 100,
    backgroundColor: '#ECECEC',
    minHeight: 40,
    paddingHorizontal: 15,
    marginVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInputStyle: {
    fontSize: 15,
    flex: 1,
    backgroundColor: '#ECECEC',
    minHeight: 40,
    borderRadius: 100,
    paddingHorizontal: 25,
    marginRight: 10,
  },
  buttonIndicatorsContainer: {
    flexDirection: 'row',
  },
  weatherNavContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 5,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'blue',
  },
  sliderContainer: {
    flex: 1,
    position: 'relative',
  },
  playContainer: {
    marginHorizontal: 10,
  },
  indicatorTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 5,
  },
  indicatorText: {
    fontSize: 11,
  },
  heatMapImageStyle: {
    flex: 1,
  },
  timeslice: {
    flex: 0.1,
    flexDirection: 'row',
    marginTop: 10,
  },
  slice: {
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    marginHorizontal: 5,
    paddingHorizontal: 4,
    backgroundColor: 'blue',
  },
});

const mapStateToProps = ({
  userReducer,
  appReducer,
}: StoreState): {userReducer: UserReducer; appReducer: AppReducer} => {
  return {
    userReducer,
    appReducer,
  };
};
export default connect(mapStateToProps)(RadarScreen);

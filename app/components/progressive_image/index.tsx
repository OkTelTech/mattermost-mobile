// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ImageContentFit, type ImageStyle} from 'expo-image';
import React, {type ReactNode, useCallback} from 'react';
import {type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import ExpoImage, {ExpoImageAnimated, ExpoImageBackground} from '@components/expo_image';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = ProgressiveImageProps & {
    children?: ReactNode | ReactNode[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    forwardRef?: React.RefObject<any>;
    id: string;
    imageStyle?: StyleProp<ImageStyle>;
    isBackgroundImage?: boolean;
    onError: () => void;
    contentFit?: ImageContentFit;
    style?: StyleProp<ViewStyle>;
    tintDefaultSource?: boolean;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        defaultImageContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        defaultImageTint: {
            flex: 1,
            tintColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});

const ProgressiveImage = ({
    children,
    defaultSource,
    forwardRef,
    id,
    imageStyle,
    imageUri,
    isBackgroundImage,
    onError,
    contentFit = 'contain',
    style = {},
    thumbnailUri,
    tintDefaultSource,
    theme,
}: Props) => {
    const styles = getStyleSheet(theme);

    const handleError = useCallback(() => {
        onError();
    }, [onError]);

    if (isBackgroundImage && imageUri) {
        return (
            <View style={[styles.defaultImageContainer, style]}>
                <ExpoImageBackground
                    id={id}
                    source={{uri: imageUri}}
                    contentFit='cover'
                    style={[StyleSheet.absoluteFill, imageStyle as StyleProp<ViewStyle>]}
                >
                    {children}
                </ExpoImageBackground>
            </View>
        );
    }

    if (defaultSource) {
        return (
            <View style={[styles.defaultImageContainer, style]}>
                <ExpoImageAnimated
                    id={id}
                    ref={forwardRef}
                    source={defaultSource}
                    style={[
                        StyleSheet.absoluteFill,
                        imageStyle,
                        tintDefaultSource ? styles.defaultImageTint : null,
                    ]}
                    contentFit={contentFit}
                    onError={onError}
                    nativeID={`image-${id}`}
                    recyclingKey={`image-${id}`}
                />
            </View>
        );
    }

    return (
        <Animated.View style={[styles.defaultImageContainer, style]}>
            <ExpoImage
                id={id}
                ref={forwardRef}
                placeholder={{uri: thumbnailUri}}
                placeholderContentFit='cover'
                nativeID={`image-${id}`}
                recyclingKey={`image-${id}`}
                testID='progressive_image.highResImage'
                transition={300}
                style={[StyleSheet.absoluteFill, imageStyle]}
                source={imageUri ? {uri: imageUri} : undefined}
                contentFit={contentFit}
                autoplay={true}
                onError={handleError}
            />
        </Animated.View>
    );
};

export default ProgressiveImage;

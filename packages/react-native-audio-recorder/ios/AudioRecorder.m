#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AudioRecorder, NSObject)

RCT_EXTERN_METHOD(printAudio:(NSString *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

import Foundation
import React

@objc(AudioRecorder)
class AudioRecorder: NSObject {

  @objc
  func printAudio(_ message: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    let response = "Native iOS received: \(message)"
    print(response)
    resolve(response)
  }
}

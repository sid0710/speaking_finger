import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import os
# from pymongo import MongoClient
import librosa
import time
import numpy as np
import json

from tornado.options import define, options

current_milli_time = lambda: int(round(time.time() * 1000))

define("port", default=8888, help="run on the given port", type=int)

class Application(tornado.web.Application):
    def __init__(self):
        # client = MongoClient('localhost', 27017)
        # db = client.user_database
        # self.user_collection = db.user_collection

        handlers = [
        (r"/audio", SoundHandler),
        (r'/(.*)', tornado.web.StaticFileHandler, {'path': os.path.dirname(__file__)})
        ]
        tornado.web.Application.__init__(self, handlers)

class SoundHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")

    def post(self):
        # if 'audio' not in self.request.files:
        #     self.finish({'Error': "No audio provided"})
        # print(self.request.body)
        json_body = tornado.escape.json_decode(self.request.body)
        audio_data_dict = json_body['data']

        audio_data = list(audio_data_dict.values())
        print(audio_data[1:10])
        # audio_filename = str(current_milli_time()) + '.wav'
        # audio_file = os.path.join('/Users/aditi/Desktop/Freelance/speaking_finger/audios', audio_filename)
        # with open(audio_file, 'wb') as f:
        #     f.write(audio_data)

        SAMPLE_RATE = 44100
        # sound, sr = librosa.load(audio_file)
        # SAMPLE_RATE = sr

        o_env = librosa.onset.onset_strength(np.asarray(audio_data), sr=SAMPLE_RATE)
        onset_frames = librosa.onset.onset_detect(onset_envelope=o_env, sr=SAMPLE_RATE)
        times = librosa.frames_to_time(onset_frames, sr=SAMPLE_RATE)

        print(times)  
        # times.tolist()

        self.write({"times_array": "siddharth"})

def main():
    tornado.options.parse_command_line()
    http_server = tornado.httpserver.HTTPServer(Application())
    http_server.listen(tornado.options.options.port)    
    tornado.ioloop.IOLoop.instance().start()

if __name__ == "__main__":
    main()

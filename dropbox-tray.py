#!/usr/bin/env python3
#
# dropbox-tray: Dropbox tray icon
# https://github.com/gavinhungry/dropbox-tray
#

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, GObject

from enum import Enum
import json
import os
import signal
import subprocess

class DropboxTray:
  class Icon(Enum):
    OFFLINE = 'icons/offline.png'
    IDLE = 'icons/idle.png'
    BUSY = 'icons/busy.png'
    BUSY2 = 'icons/busy2.png'
    ERROR = 'icons/error.png'

  class Status(Enum):
    IDLE = 'Up to date'
    INDEXING = 'Indexing'
    OFFLINE = "Dropbox isn't running!"
    SYNCING = 'Syncing'
    UPLOADING = 'Uploading'

  def __init__(self):
    self.source = os.path.dirname(os.path.realpath(__file__))
    self.directory = self.getDirectory()
    self.initIcon()
    Gtk.main()

  def getDirectory(self):
    return json.load(open(os.path.expanduser('~/.dropbox/info.json')))['personal']['path']

  def openDirectory(self, widget):
    subprocess.Popen(['xdg-open', self.directory])

  def initIcon(self):
    self.icon = Gtk.StatusIcon()
    self.setIcon(self.Icon.OFFLINE)
    self.icon.connect('activate', self.openDirectory)
    self.icon.timeout = GObject.timeout_add(500, self.update)
    self.icon.set_visible(True)

  def setIcon(self, icon):
    self.icon.attr = icon
    self.icon.set_from_file(os.path.join(self.source, icon.value))

  def setTitle(self, title):
    if self.icon.get_tooltip_text() != title:
      self.icon.set_tooltip_text(title)

  def setIconBusy(self):
    self.setIcon(self.Icon.BUSY2 if self.icon.attr == self.Icon.BUSY else self.Icon.BUSY)

  def getStatuses(self):
    return list(filter(None, os.popen('dropbox-cli status').read().split('\n')))

  def getStatus(self):
    statuses = self.getStatuses()

    if not len (statuses):
      return 'Dropbox'

    filtered = list(filter(lambda status:
      str.startswith(status, self.Status.UPLOADING.value) or
      str.startswith(status, self.Status.SYNCING.value) or
      str.startswith(status, self.Status.INDEXING.value),
    statuses))

    return filtered[0] if len(filtered) else statuses[0]

  def isRunning(self):
    return self.getStatus() != self.Status.OFFLINE.value

  def isBusy(self):
    return self.isRunning() and self.getStatus() != self.Status.IDLE.value

  def update(self):
    self.setTitle(self.getStatus())

    if self.isBusy():
      self.setIconBusy()
    else:
      self.setIcon(self.Icon.IDLE if self.isRunning() else self.Icon.OFFLINE)

    return True

if __name__ == '__main__':
  signal.signal(signal.SIGINT, signal.SIG_DFL)
  DropboxTray()

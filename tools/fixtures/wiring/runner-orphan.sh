#!/usr/bin/env bash
# PRZYNETA: nazwa check-sierota.js pada TUTAJ, w komentarzu, i to sie NIE LICZY.
# Dokladnie taki akapit stoi dzis w ci.yml przy check-dictionary.js — tlumaczy,
# dlaczego strazny NIE dostaje osobnego kroku, czyli wymienia go w zdaniu o jego
# NIEobecnosci. Naiwne "szukaj nazwy" uznaloby to za dowod obecnosci.
node tools/check-wpiety.js || rc=1

import { VolumeIcon } from '../newtab/icons'
import type { DictionaryData } from '../shared/types'
import { speak, useWordDetails } from './useWordDetails'

type Props = { word: string; meaning: string }

export function WordDetail({ word, meaning }: Props) {
    const details = useWordDetails(word)
    return <WordDetailView word={word} meaning={meaning} details={details} />
}

/** Rendering is split out so both tabs share it while each owns its own lookup. */
export function WordDetailView({ word, meaning, details }: Props & { details: DictionaryData | null }) {
    return (
        <>
            <div class="word-head">
                <span class="word-text" lang="en">
                    {word}
                </span>
                <button type="button" class="icon-button word-audio" aria-label="Telaffuzu dinle" onClick={() => speak(word)}>
                    <VolumeIcon />
                </button>
            </div>
            <div class="word-meaning">{meaning}</div>
            {details?.definition && (
                <p class="word-definition" lang="en">
                    {details.partOfSpeech && <span class="word-pos">{details.partOfSpeech}</span>}
                    {details.definition}
                </p>
            )}
            {details?.example && (
                <p class="word-example" lang="en">
                    “{details.example}”
                </p>
            )}
        </>
    )
}
